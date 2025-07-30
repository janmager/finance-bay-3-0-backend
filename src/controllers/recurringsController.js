import { API_URL, sql } from "../config/db.js";

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
    const { recurringId } = req.params;

    const result = await sql`
            DELETE FROM recurrings WHERE id = ${recurringId} RETURNING *
        `;
    res.status(200).json({ message: "Recurring deleted successfully." });
  } catch (e) {
    console.log("Error deleting the recurring: ", e);
    res.status(500).json({ message: "Something went wrong." });
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
          if (today.getDate() >= recurring.day_of_month) {
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
