import { sql } from "../config/db.js";

export async function getTransactionByUserId(req, res) {
  try {
    const { userId } = req.params;

    const transactions = await sql`
            SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC
        `;

    res.status(200).json(transactions);
  } catch (e) {
    console.log("Error getting the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function getLastDaysUserTransactions(req, res) {
  try {
    const { userId } = req.params;
    const daysBack = parseInt(req.params.daysBack, 10);

    if (isNaN(daysBack) || daysBack <= 0) {
      return res
        .status(400)
        .json({ message: "Parametr 'daysBack' musi być dodatnią liczbą." });
    }

    const now = new Date();

    now.setDate(now.getDate() - daysBack);

    const cutoffTimestamp = now.valueOf();

    const transactions = await sql`
            SELECT * FROM transactions 
            WHERE 
                user_id = ${userId}::varchar 
                AND created_at::varchar::bigint >= ${cutoffTimestamp}
            ORDER BY created_at DESC
        `;
    res.status(200).json(transactions);
  } catch (e) {
    console.log("Error getting the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function getUserMostCategoriesStats(req, res) {
  try {
    const { userId } = req.params;

    if (userId === undefined) {
      res.status(400).json({ message: "All fields are required." });
    }

    const current_month_transactions = await sql`
            SELECT * from transactions
            WHERE user_id = ${userId}::varchar
            AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE)
        `;

    const prev_month_transactions = await sql`
        SELECT * from transactions
      WHERE user_id = ${userId}::varchar
      AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      `;

    let current_month_category_stats = {};
    let previous_month_category_stats = {};
    let total_expense = 0;
    let total_income = 0;

    const parseStats = (transactions, outputObj) => {
      transactions.forEach((transaction) => {
        const { category, amount, type } = transaction;
        outputObj[category] = {
          type: type,
          ...(type == "expense" && { percentage_of_total_expenses: null }),
          ...(type == "income" && { percentage_of_total_incomes: null }),
          total_expense:
            type == "expense"
              ? (outputObj[category]?.total_expense ?? 0) + Math.abs(amount)
              : outputObj[category]?.total_expense ?? 0,
          total_income:
            type == "income"
              ? (outputObj[category]?.total_income ?? 0) + Math.abs(amount)
              : outputObj[category]?.total_income ?? 0,
        };
        if (type == "expense") total_expense += Math.abs(amount);
        if (type == "income") total_income += Math.abs(amount);
      });

      // percentage_of_total_expenses
      Object.keys(outputObj).forEach((category) => {
        outputObj[category] = {
          ...outputObj[category],
          ...(outputObj[category].type == "expense" && {
            percentage_of_total_expenses: Number(
              (
                (outputObj[category].total_expense / total_expense) *
                100
              ).toFixed(2)
            ),
          }),
          ...(outputObj[category].type == "income" && {
            percentage_of_total_incomes: Number(
              ((outputObj[category].total_income / total_income) * 100).toFixed(
                2
              )
            ),
          }),
        };
      });
      return outputObj;
    };

    current_month_category_stats = parseStats(
      current_month_transactions,
      current_month_category_stats
    );

    previous_month_category_stats = parseStats(
      prev_month_transactions,
      previous_month_category_stats
    );

    // count difference in (%) to prev month
    Object.keys(current_month_category_stats).forEach((category) => {
      if (current_month_category_stats[category]) {
        let change = 0;

        if (current_month_category_stats[category].type == "expense") {
          change = isNaN(previous_month_category_stats[category]?.total_expense)
            ? null
            : Number(
                ((current_month_category_stats[category].total_expense -
                  (previous_month_category_stats[category]?.total_expense ??
                    0)) /
                  (previous_month_category_stats[category]?.total_expense ??
                    0)) *
                  100
              );
        } else if (current_month_category_stats[category].type == "income") {
          change = isNaN(previous_month_category_stats[category]?.total_income)
            ? null
            : Number(
                ((current_month_category_stats[category].total_income -
                  (previous_month_category_stats[category]?.total_income ??
                    0)) /
                  (previous_month_category_stats[category]?.total_income ??
                    0)) *
                  100
              );
        }

        current_month_category_stats[category] = {
          ...current_month_category_stats[category],
          change_percentage_to_previous_month: change,
        };
      }
    });

    res.status(200).json({
      current: current_month_category_stats,
      previous: previous_month_category_stats,
    });
  } catch (e) {
    console.log("Error getting the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function createTransaction(req, res) {
  try {
    const {
      user_id,
      title,
      amount,
      category,
      note,
      transaction_type,
      internal_operation,
    } = req.body;

    if (!title || !user_id || amount === undefined || !category) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const transactionAmount =
      transaction_type === "expense" ? -Math.abs(amount) : Math.abs(amount);

    const id = crypto.randomUUID();
    const transaction = await sql`
        INSERT INTO transactions (id, user_id, title, amount, category, created_at, type, internal_operation, note) 
        VALUES (${id}, ${user_id}, ${title}, ${transactionAmount}, ${category}, ${new Date().valueOf()}, ${transaction_type}, ${internal_operation}, ${note})
            RETURNING *
        `;

    if (transaction_type === "expense" || transaction_type === "income") {
      await sql`
                UPDATE users SET balance = balance + ${transactionAmount} WHERE id = ${user_id}
            `;
    }

    res.status(201).json(transaction[0]);
  } catch (e) {
    console.log("Error creating the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const result = await sql`
            DELETE FROM transactions WHERE id = ${id} RETURNING *
        `;

    if (result.count === 0) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    const deletedTransaction = result[0];
    const { user_id, amount } = deletedTransaction;

    await sql`
            UPDATE users SET balance = balance - ${amount} WHERE id = ${user_id}
        `;

    res.status(200).json({ message: "Transaction deleted successfully." });
  } catch (e) {
    console.log("Error deleting the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function getSummaryByUserId(req, res) {
  try {
    const { userId } = req.params;

    const balanceResult = await sql`
            SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE user_id = ${userId}
        `;

    const incomeResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as income FROM transactions WHERE user_id = ${userId} AND amount > 0
        `;

    const expenseResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as expense FROM transactions WHERE user_id = ${userId} AND amount < 0
        `;

    const totalTransactions = await sql`
            SELECT COUNT(*) as totalTransaction FROM transactions WHERE user_id = ${userId}
        `;

    res.status(200).json({
      balance: Number(balanceResult[0].balance),
      income: Number(incomeResult[0].income),
      expense: Number(expenseResult[0].expense),
      total_transactions: parseInt(totalTransactions[0].totaltransaction),
    });
  } catch (e) {
    console.log("Error getting the transaction summary: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}
