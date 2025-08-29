import { API_URL, sql } from "../config/db.js";
import { createTransaction } from "./transactionsController.js";

export async function getUserSavings(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    let userSavings = await sql`
      SELECT * FROM savings WHERE user_id = ${userId}::varchar
    `;

    userSavings.map((item) => {
      item["goal_percentage"] =
        (Number(item.deposited) / Number(item.goal)) * 100;
    });

    res.status(200).json(userSavings);
  } catch (e) {
    console.error("Error in getUserSavings:", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function createSaving(req, res) {
  try {
    const { title, goal } = req.body;

    const { userId } = req.params;

    if (!title || !goal) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const id = crypto.randomUUID();
    const savings = await sql`
       INSERT INTO savings (id, user_id, title, goal, created_at)
        VALUES (${id}, ${userId}, ${title}, ${goal}, ${new Date()
      .valueOf()
      .toString()})
          RETURNING *
        `;

    res.status(201).json(savings[0]);
  } catch (e) {
    console.log("Error creating the saving: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function updateSaving(req, res) {
  try {
    const { title, goal } = req.body;
    const { id, userId } = req.params;

    if (!title || !goal) {
      return res.status(400).json({ message: "Title and goal amount are required." });
    }

    // Validate title length
    if (title.trim().length === 0 || title.trim().length > 255) {
      return res.status(400).json({ message: "Title must be between 1 and 255 characters." });
    }

    // Validate goal amount
    const goalNumber = Number(goal);
    if (isNaN(goalNumber) || goalNumber <= 0) {
      return res.status(400).json({ message: "Goal amount must be a positive number." });
    }

    // Validate goal amount is not unreasonably large
    if (goalNumber > 1000000) {
      return res.status(400).json({ message: "Goal amount cannot exceed 1,000,000 PLN." });
    }

    // Check if saving exists and belongs to user
    const existingSaving = await sql`
      SELECT * FROM savings WHERE id = ${id} AND user_id = ${userId}::varchar
    `;

    if (existingSaving.length === 0) {
      return res.status(404).json({ message: "Saving not found or access denied." });
    }

    // Check if new goal is less than current deposited amount
    if (goalNumber < Number(existingSaving[0].deposited)) {
      return res.status(400).json({ 
        message: "New goal amount cannot be less than the current deposited amount." 
      });
    }

    // Update the saving
    const updatedSaving = await sql`
      UPDATE savings 
      SET title = ${title.trim()}, goal = ${goalNumber}
      WHERE id = ${id} AND user_id = ${userId}::varchar 
      RETURNING *
    `;

    // Calculate new goal percentage
    const saving = updatedSaving[0];
    saving.goal_percentage = (Number(saving.deposited) / Number(saving.goal)) * 100;

    res.status(200).json({
      message: "Saving updated successfully",
      data: saving
    });
  } catch (e) {
    console.log("Error updating the saving: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function deleteSaving(req, res) {
  const { id, userId } = req.params;
  try {
    const result = await sql`
            DELETE FROM savings WHERE id = ${id} AND user_id = ${userId} RETURNING *
        `;

    res.status(200).json({ message: "Saving deleted successfully." });
  } catch (e) {
    console.log("Error deleting the saving: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function depositToSaving(req, res) {
  try {
    const { amount, saving_id } = req.body;
    const { userId } = req.params;

    if (!amount || !saving_id || !userId) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const updateSaving = await sql`
            UPDATE savings SET deposited = deposited + ${amount} WHERE id = ${saving_id} AND user_id = ${userId} RETURNING *
        `;

    const addUserTransaction = await fetch(API_URL + "/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title: "Wpłata oszczędności",
        amount,
        category: "invest-goal",
        note: `Wpłata ${amount.toFixed(2)}zł na cel oszczędnościowy ${
          updateSaving[0].title
        }.`,
        transaction_type: "expense",
        internal_operation: true,
      }),
    });

    if (updateSaving.length && addUserTransaction.ok) {
      res.status(200).json(updateSaving[0]);
    } else {
      res.status(404).json({ message: "Saving not found." });
    }
  } catch (e) {
    console.log("Error depositing to saving: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function withdrawFromSaving(req, res) {
  try {
    const { amount, saving_id } = req.body;
    const { userId } = req.params;

    if (!amount || !saving_id || !userId) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const updateSaving = await sql`
            UPDATE savings SET deposited = deposited - ${amount} WHERE id = ${saving_id} AND user_id = ${userId} RETURNING *
        `;

    const addUserTransaction = await fetch(API_URL + "/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title: "Wypłata oszczędności",
        amount,
        category: "invest-goal",
        note: `Wypłata ${amount.toFixed(2)}zł z celu oszczędnościowego ${
          updateSaving[0].title
        }.`,
        transaction_type: "income",
        internal_operation: true,
      }),
    });

    if (updateSaving.length && addUserTransaction.ok) {
      res.status(200).json(updateSaving[0]);
    } else {
      res.status(404).json({ message: "Saving not found." });
    }
  } catch (e) {
    console.log("Error withdrawing from saving: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}
