import { sql } from "../config/db.js";

export async function getUserBalancesLogs(req, res) {
  try {
    const { userId } = req.params;

    const logs = await sql`
            SELECT * FROM balances_logs WHERE user_id = ${userId} ORDER BY created_at ASC
        `;

    res.status(200).json(logs);
  } catch (e) {
    console.log("Error getting the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}
