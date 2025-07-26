import { API_URL, sql } from "../config/db.js";

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
    console.log("Error creating the saving: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

// todo
export async function checkCurrentMonthRecurrings(req, res) {

}