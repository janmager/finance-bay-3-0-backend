import { sql, API_URL } from "../config/db.js";
import crypto from "crypto";
import fetch from "node-fetch";

export async function getIncomingIncomesByUserId(req, res) {
  try {
    const { userId } = req.params;

    const incomingIncomes = await sql`
            SELECT * FROM incoming_incomes WHERE user_id = ${userId} ORDER BY created_at DESC
        `;

    res.status(200).json(incomingIncomes);
  } catch (e) {
    console.log("Error getting the incoming incomes: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function deleteIncomingIncome(req, res) {
  try {
    const { id, userId } = req.params;

    const result = await sql`
            DELETE FROM incoming_incomes WHERE id = ${id} AND user_id = ${userId}
        `;

    res.status(200).json({ message: "Incoming income deleted successfully." });
  } catch (e) {
    console.log("Error deleting the incoming income: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function createIncomingIncome(req, res) {
  try {
    const { title, description, deadline, amount, user_id, auto_settle } = req.body;

    // Validate required fields
    if (!title || !amount || !user_id) {
      return res.status(400).json({ 
        message: "Missing required fields. title, amount, and user_id are required." 
      });
    }

    const newIncomingIncome = await sql`
            INSERT INTO incoming_incomes (id, title, description, deadline, amount, user_id, auto_settle, created_at)
            VALUES (${crypto.randomUUID()}, ${title}, ${description || null}, ${deadline || null}, ${amount}, ${user_id}, ${auto_settle || false}, ${new Date().toISOString()})
            RETURNING *
        `;

    res.status(201).json(newIncomingIncome[0]);
  } catch (e) {
    console.log("Error creating the incoming income: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function settleIncomingIncome(req, res) {
  try {
    const { id, userId } = req.params;

    if (!id || !userId) {
      return res.status(400).json({ message: "Income ID and user ID are required." });
    }

    // Get the incoming income details
    const incomingIncome = await sql`
      SELECT * FROM incoming_incomes WHERE id = ${id} AND user_id = ${userId}
    `;

    if (incomingIncome.length === 0) {
      return res.status(404).json({ message: "Incoming income not found." });
    }

    const income = incomingIncome[0];

    // Create transaction for the incoming income
    const transactionResponse = await fetch(`${API_URL}/api/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
              body: JSON.stringify({
          user_id: userId,
          title: income.title,
          amount: income.amount,
          category: "incoming-incomes",
          note: `Rozliczenie przychodu: ${income.description || income.title}`,
          transaction_type: "income",
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

    // Delete the incoming income after successful transaction creation
    await sql`
      DELETE FROM incoming_incomes WHERE id = ${id} AND user_id = ${userId}
    `;

    res.status(200).json({ 
      message: "Incoming income settled successfully",
      transaction: await transactionResponse.json()
    });
  } catch (e) {
    console.log("Error settling incoming income: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function checkAllUsersForIncomingIncomes() {
  try {
    const users = await sql`
      SELECT id FROM users
    `;

    for (const user of users) {
      const incomingIncomes = await sql`
        SELECT * FROM incoming_incomes 
        WHERE user_id = ${user.id} 
        AND auto_settle = true
      `;

      for (const income of incomingIncomes) {
        // Create transaction for the incoming income
        await fetch(API_URL + "/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            title: income.title,
            amount: income.amount,
            category: "incoming-incomes",
            note: `Automatyczne rozliczenie: ${income.description || income.title}`,
            transaction_type: "income",
            internal_operation: false,
          }),
        });

        // Delete the incoming income after settlement
        await sql`
          DELETE FROM incoming_incomes WHERE id = ${income.id}
        `;
      }
    }
    
    // Successfully processed all users
    return true;
  } catch (e) {
    console.log("Error checking incoming incomes: ", e);
    return false;
  }
}
