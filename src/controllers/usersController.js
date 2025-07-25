
import { sql } from "../config/db.js";

export async function createUser(req, res) {
  try {
    const { user_id, email, avatar } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "All fields are required." });
    }

    let username = "";
    if (email) {
      username = email.split("@")[0];
    }

    const if_is = await sql`
            SELECT * FROM users WHERE id = ${user_id} OR email = ${email}
        `;

    if (if_is.length > 0) {
      if (if_is[0].username == "") {
        const init_username = await sql`
                    UPDATE users SET username = ${username} WHERE id = ${user_id} RETURNING *
                `;
        return res.status(200).json({ data: init_username[0] });
      } else return res.status(200).json({ data: if_is[0] });
    }

    const users = await sql`
        INSERT INTO users (id, email, username, monthly_limit, avatar) 
        VALUES (${user_id}, ${email}, ${username ?? ""}, 3000, ${avatar})
            RETURNING *
        `;
    res.status(201).json({ data: users[0] });
  } catch (e) {
    console.log("Error creating user: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function updateUserBalance(req, res) {
  try {
    const { new_balance } = req.body;
    const { userId } = req.params;

    if (!userId || !type || !new_balance) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const upd = await sql`
        UPDATE users SET balance = ${new_balance} WHERE id = ${userId} RETURNING *
    `;

    res.status(200).json(upd[0]);
  } catch (e) {
    console.log("Error updating user: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function getUserOverview(req, res) {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const userDataResult = await sql`
      SELECT * FROM users WHERE id = ${userId}::varchar
    `;

    if (userDataResult.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    const user = userDataResult[0];

    const thisMonthTransactionsResult = await sql`
      SELECT * FROM transactions 
      WHERE user_id = ${userId}::varchar
        AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE)
    `;

    const lastMonthTransactionsResult = await sql`
      SELECT * FROM transactions 
      WHERE user_id = ${userId}::varchar
        AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
    `;

    let local_total = {
      thisMonth: {
        expense: 0,
        income: 0,
      },
      lastMonth: {
        expense: 0,
        income: 0,
      },
    };

    if (thisMonthTransactionsResult.length) {
      thisMonthTransactionsResult.map((operation) => {
        if (operation.type == "expense" && operation.internal_operation == false)
          local_total.thisMonth.expense += Math.abs(operation.amount);
      });
    }

    if (lastMonthTransactionsResult.length) {
      lastMonthTransactionsResult.map((operation) => {
        if (operation.type == "expense" && operation.internal_operation == false)
          local_total.lastMonth.expense += Math.abs(operation.amount);
      });
    }

    const percentOfBdg = (local_total.thisMonth.expense / user.monthly_limit) * 100;

    let output = {
      user,
      thisMonthTransactions: {
        total: {
          expense: local_total.thisMonth.expense,
          income: local_total.lastMonth.income,
        },
        percentOfBudget: `${percentOfBdg ?? 0}%`,
        transactions: thisMonthTransactionsResult,
      },
      lastMonthTransactions: {
        total: {
          expense: local_total.lastMonth.expense,
          income: local_total.lastMonth.income,
        },
        transactions: lastMonthTransactionsResult,
      },
    };

    // console.log(output);

    res.status(200).json(output);
  } catch (e) {
    console.error("Error in getUserOverview:", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}
