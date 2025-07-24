import { sql } from "../config/db.js";

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
      item['goal_percentage'] = (Number(item.deposited)/Number(item.goal))*100
    })

    res.status(200).json(userSavings);
  }
  catch(e){
    console.error("Error in getUserSavings:", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function createSaving(req, res) {
  try {
    const {
      title, goal
    } = req.body;

    const { userId } = req.params;

    if (!title || !goal) {
      return res.status(400).json({ message: "All fields are required." });
    }
  console.log(title, goal, userId)

    const id = crypto.randomUUID();
    const savings = await sql`
       INSERT INTO savings (id, user_id, title, goal, created_at)
        VALUES (${id}, ${userId}, ${title}, ${goal}, ${new Date().valueOf().toString()})
          RETURNING *
        `;

    res.status(201).json(savings[0]);
  } catch (e) {
    console.log("Error creating the saving: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}