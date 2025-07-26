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

export async function deleteSaving(req, res) {
  const { id } = req.params;
  try {
    const result = await sql`
            DELETE FROM savings WHERE id = ${id} RETURNING *
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
    console.log(e);
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
  } catch (e) {}
}
