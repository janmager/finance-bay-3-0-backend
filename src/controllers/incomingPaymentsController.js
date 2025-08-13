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
        const today = new Date();
        const deadline = new Date(payment.deadline);
        
        // Check if today is >= deadline
        if (today >= deadline) {
          // Create transaction for the incoming payment
          await fetch(API_URL + "/api/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: user.id,
              title: payment.title,
              amount: payment.amount,
              category: "incoming_payment",
              note: `Automatyczne rozliczenie: ${payment.description || payment.title}`,
              transaction_type: "expense",
              internal_operation: false,
            }),
          });

          // Delete the incoming payment after settlement
          await sql`
            DELETE FROM incoming_payments WHERE id = ${payment.id}
          `;
        }
      }
    }
    
    console.log("Users successfully checked for incoming payments due for settlement.");
    return true;
  } catch (e) {
    console.log("Error checking incoming payments: ", e);
    return false;
  }
}
