import { sql } from "../config/db.js";
import { API_URL } from "../config/db.js";
import crypto from "crypto";

export async function getIncomingPaymentsByUserId(req, res) {
  try {
    const { userId } = req.params;

    const incomingPayments = await sql`
            SELECT * FROM incoming_payments WHERE user_id = ${userId} ORDER BY deadline ASC
        `;

    res.status(200).json(incomingPayments);
  } catch (e) {
    console.log("Error getting the incoming payments: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function deleteIncomingPayment(req, res) {
  try {
    const { id, userId } = req.params;

    const result = await sql`
            DELETE FROM incoming_payments WHERE id = ${id} AND user_id = ${userId}
        `;

    res.status(200).json({ message: "Incoming payment deleted successfully." });
  } catch (e) {
    console.log("Error deleting the incoming payment: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function createIncomingPayment(req, res) {
  try {
    const { title, description, deadline, amount, user_id, auto_settle } = req.body;

    // Validate required fields
    if (!title || !amount || !user_id) {
      return res.status(400).json({ 
        message: "Missing required fields. id, title, amount, and user_id are required." 
      });
    }

    const newIncomingPayment = await sql`
            INSERT INTO incoming_payments (id, title, description, deadline, amount, user_id, auto_settle)
            VALUES (${crypto.randomUUID()}, ${title}, ${description || null}, ${deadline || null}, ${amount}, ${user_id}, ${auto_settle})
            RETURNING *
        `;

    res.status(201).json(newIncomingPayment[0]);
  } catch (e) {
    console.log("Error creating the incoming payment: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function settleIncomingPayment(req, res) {
  try {
    const { id, userId } = req.params;

    if (!id || !userId) {
      return res.status(400).json({ message: "Payment ID and user ID are required." });
    }

    // Get the incoming payment details
    const incomingPayment = await sql`
      SELECT * FROM incoming_payments WHERE id = ${id} AND user_id = ${userId}
    `;

    if (incomingPayment.length === 0) {
      return res.status(404).json({ message: "Incoming payment not found." });
    }

    const payment = incomingPayment[0];

    // Create transaction for the incoming payment
    const transactionResponse = await fetch(`${API_URL}/api/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title: payment.title,
        amount: payment.amount,
        category: "incoming-payments",
        note: `Rozliczenie płatności: ${payment.description || payment.title}`,
        transaction_type: "expense",
        internal_operation: false,
      }),
    });

    if (!transactionResponse.ok) {
      const errorData = await transactionResponse.json();
      return res.status(500).json({ 
        message: "Failed to create transaction", 
        error: errorData.message 
      });
    }

    // Delete the incoming payment after successful transaction creation
    await sql`
      DELETE FROM incoming_payments WHERE id = ${id} AND user_id = ${userId}
    `;

    res.status(200).json({ 
      message: "Incoming payment settled successfully",
      transaction: await transactionResponse.json()
    });
  } catch (e) {
    console.log("Error settling incoming payment: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function checkAllUsersForIncomingPayments() {
  try {
    const users = await sql`
      SELECT id FROM users
    `;

    for (const user of users) {
      const incomingPayments = await sql`
        SELECT * FROM incoming_payments 
        WHERE user_id = ${user.id} 
        AND auto_settle = true
        AND deadline IS NOT NULL
      `;

      for (const payment of incomingPayments) {
        if (payment.deadline) {
          const deadlineDate = new Date(payment.deadline);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (deadlineDate <= today && payment.auto_settle) {
            // Auto-settle the payment
            await sql`
              UPDATE incoming_payments 
              SET auto_settle = false 
              WHERE id = ${payment.id}
            `;
            
            // Create a transaction for the settled payment
            const transactionId = crypto.randomUUID();
            await sql`
              INSERT INTO transactions (id, user_id, title, amount, category, created_at, type, internal_operation, note)
              VALUES (${transactionId}, ${payment.user_id}, ${payment.title || 'Incoming Payment'}, ${payment.amount}, 'incoming-payment', ${new Date().valueOf()}, 'income', false, ${payment.description || 'Auto-settled incoming payment'})
            `;
            
            // Update user balance
            await sql`
              UPDATE users SET balance = balance + ${payment.amount} WHERE id = ${payment.user_id}
            `;
            
            // Log balance update
            const logId = crypto.randomUUID();
            await sql`
              INSERT INTO balances_logs (id, user_id, balance, created_at)
              VALUES (${logId}, ${payment.user_id}, (SELECT balance FROM users WHERE id = ${payment.user_id}), ${new Date().valueOf()})
            `;
          }
        }
      }
      
      // Successfully processed all users
    } catch (e) {
      console.log("Error checking incoming payments: ", e);
    }
}
