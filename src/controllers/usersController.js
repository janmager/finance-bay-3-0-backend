import { API_URL, sql } from "../config/db.js";
import fetch from "node-fetch";

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
        INSERT INTO users (id, email, username, monthly_limit, avatar, currency, balance) 
        VALUES (${user_id}, ${email}, ${
      username ?? ""
    }, 3000, ${avatar}, 'pln', 0)
            RETURNING *`;
    res.status(201).json({ data: users[0] });
  } catch (e) {
    console.log("Error creating user: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function getTotalAccountValue(req, res) {
  try {
    const { userId } = req.params;
    let segments = [];

    // account balance
    const user = await sql`
      SELECT * FROM users WHERE id = ${userId}::varchar
    `;

    // total of savings
    const userSavings = await sql`
      SELECT * FROM savings WHERE user_id = ${userId}::varchar
    `;

    

    
    let totalSavings = 0;
    if (userSavings.length) {
      userSavings.map((save) => (totalSavings += Number(save.deposited)));
      segments.push({
        label: "savings",
        value: Number(totalSavings),
      });
    }

    // total of foreign currencies in PLN
    let totalForeignCurrencies = 0;
    try {
      const foreignCurrenciesResponse = await fetch(`${API_URL}/api/foreign-currencies/${userId}/total-value`);
      
      if (foreignCurrenciesResponse.ok) {
        const foreignCurrenciesData = await foreignCurrenciesResponse.json();
        totalForeignCurrencies = Number(foreignCurrenciesData.totalValuePLN);
        
        if (totalForeignCurrencies > 0) {
          segments.push({
            label: "foreign-currencies",
            value: totalForeignCurrencies,
          });
        }
      }
    } catch (foreignCurrenciesError) {
      console.log("Error fetching foreign currencies total value:", foreignCurrenciesError);
      // Continue without foreign currencies if there's an error
    }

    let total = Number(user[0].balance) + Number(totalSavings) + Number(totalForeignCurrencies);
    segments.push({
      label: "wallet",
      value: Number(user[0].balance),
    });

    console.log('segments', segments);

    let percent_segments = [];
    segments.map((seg) => {
      let temp = {
        value: seg.value,
        label: seg.label,
        percent_of_all: (seg.value / total) * 100,
      };
      percent_segments.push(temp);
    });

    let out = {
      total: total,
      segments: percent_segments,
    };

    res.status(200).json(out);
  } catch (e) {
    console.log("Error in getTotalAccountValue: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function saveUserTotalAcccountValueTologs(req, res) {
  try {
    const users = await sql`
      SELECT * FROM users
    `;

    for (const user of users) {
      const id = crypto.randomUUID();
      let total = await fetch(
        `${API_URL}/api/users/totalAccountValue/${user.id}`
      );
      const resp = await total.json();
      const accountValueLog = await sql`
        INSERT INTO account_value_logs (id, user_id, value_json, created_at)
        VALUES (${id}, ${user.id}, ${JSON.stringify(
        resp
      )}, ${new Date().valueOf()})
      `;
    }
  } catch (e) {
    console.log("Error in saveUserTotalAcccountValueTologs: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function saveUserBalancesToLogs(req, res) {
  try {
    const users = await sql`
      SELECT * FROM users
    `;

    for (const user of users) {
      const id = crypto.randomUUID();
      const balanceLog = await sql`
        INSERT INTO balances_logs (id, user_id, balance, created_at)
        VALUES (${id}, ${user.id}, ${Number(
        user.balance
      )}, ${new Date().valueOf()})
      `;
    }
  } catch (e) {
    console.log("Error in saveUserBalancesToLogs: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function updateUserBalance(req, res) {
  try {
    const { new_balance } = req.body;
    const { userId } = req.params;

    if (!userId || !new_balance) {
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

export async function updateUserMonthlyLimit(req, res) {
  try {
    const { new_monthly_limit } = req.body;
    const { userId } = req.params;

    if (!userId || !new_monthly_limit) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const upd = await sql`
        UPDATE users SET monthly_limit = ${new_monthly_limit} WHERE id = ${userId} RETURNING *
    `;

    res.status(200).json(upd[0]);
  } catch (e) {
    console.log("Error updating user monthly limit: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function updateUserUsername(req, res) {
  try {
    const { username } = req.body;
    const { userId } = req.params;

    if (!userId || !username) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const upd = await sql`
        UPDATE users SET username = ${username} WHERE id = ${userId} RETURNING *
    `;

    res.status(200).json(upd[0]);
  } catch (e) {
    console.log("Error updating user username:", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

// Add or update FCM token for user
export async function updateUserFCMToken(req, res) {
  try {
    const { fcm_token, user_id } = req.body;


    if (!user_id || !fcm_token) {
      return res.status(400).json({ message: "User ID and FCM token are required." });
    }

    // Check if user exists
    const userExists = await sql`
      SELECT fcm_tokens FROM users WHERE id = ${user_id}::varchar
    `;

    if (userExists.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    let currentTokens = userExists[0].fcm_tokens || [];
    
    // Convert to array if it's a string (for backward compatibility)
    if (typeof currentTokens === 'string') {
      try {
        currentTokens = JSON.parse(currentTokens);
      } catch (parseError) {
        console.log("Error parsing FCM tokens string, starting with empty array");
        currentTokens = [];
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(currentTokens)) {
      currentTokens = [];
    }
    
    // If token doesn't exist, add it
    if (!currentTokens.includes(fcm_token)) {
      currentTokens.push(fcm_token);
      
      const updatedUser = await sql`
        UPDATE users 
        SET fcm_tokens = ${JSON.stringify(currentTokens)}::jsonb
        WHERE id = ${user_id}::varchar 
        RETURNING id, fcm_tokens
      `;

      res.status(200).json({
        message: "FCM token added successfully",
        data: updatedUser[0]
      });
    } else {
      res.status(200).json({
        message: "FCM token already exists",
        data: { id: user_id, fcm_tokens: currentTokens }
      });
    }

  } catch (e) {
    console.log("Error updating user FCM token:", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

// Remove FCM token for user
export async function removeUserFCMToken(req, res) {
  try {
    const { fcm_token, user_id } = req.body;

    if (!user_id || !fcm_token) {
      return res.status(400).json({ message: "User ID and FCM token are required." });
    }

    // Check if user exists
    const userExists = await sql`
      SELECT fcm_tokens FROM users WHERE id = ${user_id}::varchar
    `;

    if (userExists.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    let currentTokens = userExists[0].fcm_tokens || [];
    
    // Convert to array if it's a string (for backward compatibility)
    if (typeof currentTokens === 'string') {
      try {
        currentTokens = JSON.parse(currentTokens);
      } catch (parseError) {
        console.log("Error parsing FCM tokens string, starting with empty array");
        currentTokens = [];
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(currentTokens)) {
      currentTokens = [];
    }
    
    // Remove token if it exists
    const updatedTokens = currentTokens.filter(token => token !== fcm_token);
    
    if (updatedTokens.length !== currentTokens.length) {
      const updatedUser = await sql`
        UPDATE users 
        SET fcm_tokens = ${JSON.stringify(updatedTokens)}::jsonb
        WHERE id = ${user_id}::varchar 
        RETURNING id, fcm_tokens
      `;

      res.status(200).json({
        message: "FCM token removed successfully",
        data: updatedUser[0]
      });
    } else {
      res.status(200).json({
        message: "FCM token not found",
        data: { id: user_id, fcm_tokens: currentTokens }
      });
    }

  } catch (e) {
    console.log("Error removing user FCM token:", e);
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

    // Pobierz kursy walut
    const currencyRatesResult = await sql`
      SELECT * FROM currencies ORDER BY name
    `;

    // Pobierz waluty obce użytkownika
    const userForeignCurrenciesResult = await sql`
      SELECT * FROM foreign_currencies 
      WHERE user_id = ${userId}::varchar
      ORDER BY currency
    `;

    // Zestaw kursy walut z walutami obcymi użytkownika
    const currenciesWithRates = currencyRatesResult.map(rate => {
      const userCurrency = userForeignCurrenciesResult.find(fc => 
        fc.currency.toUpperCase() === rate.name.split('/')[0]
      );
      
      return {
        currency_pair: rate.name,
        currency_code: rate.name.split('/')[0],
        rate_pln: parseFloat(rate.rate_pln),
        last_update: rate.last_update_rate,
        user_amount: userCurrency ? parseFloat(userCurrency.amount) : 0,
        user_amount_pln: userCurrency ? (parseFloat(userCurrency.amount) * parseFloat(rate.rate_pln)).toFixed(2) : 0
      };
    });

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
        if (
          operation.type == "expense" &&
          operation.internal_operation == false
        )
          local_total.thisMonth.expense += Math.abs(operation.amount);
      });
    }

    if (lastMonthTransactionsResult.length) {
      lastMonthTransactionsResult.map((operation) => {
        if (
          operation.type == "expense" &&
          operation.internal_operation == false
        )
          local_total.lastMonth.expense += Math.abs(operation.amount);
      });
    }

    const percentOfBdg =
      (local_total.thisMonth.expense / user.monthly_limit) * 100;

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
      currencies: {
        rates: currenciesWithRates,
        user_foreign_currencies: userForeignCurrenciesResult
      }
    };

    // console.log(output);

    res.status(200).json(output);
  } catch (e) {
    console.error("Error in getUserOverview:", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}
