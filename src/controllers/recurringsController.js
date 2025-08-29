import { API_URL, sql } from "../config/db.js";
import crypto from "crypto";

const getCurrentMonthRecurring = (date) => {
  if (!date) {
    const d = new Date();
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}.${d
      .getFullYear()
      .toString()
      .slice(-2)}`;
  }
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}.${date
    .getFullYear()
    .toString()
    .slice(-2)}`;
};

export async function getRecurrings(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    let userRecurrings = await sql`
      SELECT * FROM recurrings WHERE user_id = ${userId}::varchar
    `;

    res.status(200).json(userRecurrings);
  } catch (e) {
    console.error("Error in getRecurrings:", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function deleteRecurring(req, res) {
  try {
    const { recurringId, userId } = req.params;

    // Sprawdź czy recurring istnieje
    const existingRecurring = await sql`
      SELECT * FROM recurrings WHERE id = ${recurringId} AND user_id = ${userId}
    `;

    if (existingRecurring.length === 0) {
      return res.status(404).json({ 
        message: "Recurring payment not found or you don't have permission to delete it." 
      });
    }

    // Usuń recurring
    const result = await sql`
      DELETE FROM recurrings WHERE id = ${recurringId} AND user_id = ${userId} RETURNING *
    `;

    if (result.length === 0) {
      return res.status(500).json({ 
        message: "Failed to delete recurring payment." 
      });
    }

    console.log(`✅ Recurring payment ${recurringId} deleted successfully for user ${userId}`);
    res.status(200).json({ 
      message: "Recurring payment deleted successfully.",
      deletedRecurring: result[0]
    });
  } catch (e) {
    console.error("Error deleting the recurring: ", e);
    res.status(500).json({ message: "Something went wrong while deleting recurring payment." });
  }
}

export async function createRecurring(req, res) {
  try {
    const { title, amount, day_of_month, last_month_paid } = req.body;

    const { userId } = req.params;

    if (!title || !amount || !day_of_month) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const id = crypto.randomUUID();
    const recurrings = await sql`
       INSERT INTO recurrings (id, user_id, title, amount, day_of_month, last_month_paid)
        VALUES (${id}, ${userId}, ${title}, ${amount}, ${day_of_month}, ${last_month_paid})
          RETURNING *
        `;

    res.status(200).json(recurrings[0]);
  } catch (e) {
    console.log("Error creating the recurring: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function checkAllUsersForRecurrings() {
  try {
    const users = await sql`
      SELECT id FROM users
    `;

    for (const user of users) {
      const recurrings = await sql`
        SELECT * FROM recurrings WHERE user_id = ${user.id}
      `;

      for (const recurring of recurrings) {
        const currentMonth = getCurrentMonthRecurring();
        if (recurring.last_month_paid !== currentMonth) {
          const today = new Date();
          if (today.getDate() >= Number(recurring.day_of_month)) {
            // Create transaction
            await fetch(API_URL + "/api/transactions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_id: user.id,
                title: recurring.title,
                amount: recurring.amount,
                category: "recurring",
                note: `Płatność cykliczna za ${recurring.title}.`,
                transaction_type: "expense",
                internal_operation: false,
              }),
            });

            // Update recurring last_month_paid
            await sql`
              UPDATE recurrings SET last_month_paid = ${currentMonth} WHERE id = ${recurring.id}
            `;
          }
        }
      }
    }
    res
      .status(200)
      .json({
        message: `Users successfully checked for the current month recurrings.`,
      });
  } catch (e) {
    return false;
  }
}
