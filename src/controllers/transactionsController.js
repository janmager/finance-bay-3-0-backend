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

export async function getUserDataCalendar(req, res) {
  try {
    const { userId } = req.params;

    const transactions = await sql`
            SELECT *
            FROM transactions
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
    `;

    const monthNames = [
      "styczeń",
      "luty",
      "marzec",
      "kwiecień",
      "maj",
      "czerwiec",
      "lipiec",
      "sierpień",
      "wrzesień",
      "październik",
      "listopad",
      "grudzień",
    ];

    const dayNames = [
      "Niedziela",
      "Poniedziałek",
      "Wtorek",
      "Środa",
      "Czwartek",
      "Piątek",
      "Sobota",
    ];

    // Grupuj transakcje według miesięcy
    const transactionsByMonth = {};

    transactions.forEach((transaction) => {
      // Parsuj timestamp jako liczbę
      const timestamp = parseInt(transaction.created_at);
      const date = new Date(timestamp);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (!transactionsByMonth[monthKey]) {
        transactionsByMonth[monthKey] = [];
      }
      transactionsByMonth[monthKey].push(transaction);
    });

    // Jeśli brak transakcji, dodaj aktualny miesiąc
    if (Object.keys(transactionsByMonth).length === 0) {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
      transactionsByMonth[currentMonthKey] = [];
    }

    let out = [];

    // Przetwórz każdy miesiąc
    Object.keys(transactionsByMonth).forEach((monthKey) => {
      const [year, month] = monthKey.split("-").map(Number);
      const monthTransactions = transactionsByMonth[monthKey];

      // Grupuj transakcje według dni
      const transactionsByDay = {};
      monthTransactions.forEach((transaction) => {
        const timestamp = parseInt(transaction.created_at);
        const date = new Date(timestamp);
        const day = date.getDate();

        if (!transactionsByDay[day]) {
          transactionsByDay[day] = [];
        }
        transactionsByDay[day].push(transaction);
      });

      // Utwórz kalendarz dla miesiąca
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const daysInMonth = lastDayOfMonth.getDate();

      // Pierwszy dzień tygodnia (0 = niedziela, 1 = poniedziałek, itd.)
      let firstDayWeekday = firstDayOfMonth.getDay();
      // Konwertuj tak, żeby poniedziałek był pierwszym dniem (0)
      firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

      const weeks = [];
      let currentWeek = [];

      // Aktualny dzień dla porównania
      const today = new Date();
      const todayDateString = today.toDateString();

      // Oblicz dni z poprzedniego miesiąca na początku pierwszego tygodnia
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

      // Dodaj dni z poprzedniego miesiąca na początku pierwszego tygodnia
      for (let i = firstDayWeekday - 1; i >= 0; i--) {
        const prevDay = lastDayOfPrevMonth - i;
        const prevDate = new Date(prevYear, prevMonth, prevDay);
        let prevDayWeekday = prevDate.getDay();
        prevDayWeekday = prevDayWeekday === 0 ? 6 : prevDayWeekday - 1;

        // Sprawdź czy dzień jest w przeszłości czy przyszłości
        const isPast =
          prevDate < today && prevDate.toDateString() !== todayDateString;

        const prevDayObj = {
          num: prevDay,
          dayNum: prevDayWeekday + 1,
          dayLabel: dayNames[prevDate.getDay()],
          total_balance_this_day: isPast ? 0 : null, // 0 dla przeszłości, null dla przyszłości
          previous_month: true,
          monthDay: prevDay,
          monthNum: prevMonth + 1,
          year: prevYear,
          transactions: [],
        };

        currentWeek.push(prevDayObj);
      }

      // Dodaj wszystkie dni aktualnego miesiąca
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        let dayWeekday = date.getDay();
        // Konwertuj tak, żeby poniedziałek był pierwszym dniem (0)
        dayWeekday = dayWeekday === 0 ? 6 : dayWeekday - 1;

        // Oblicz sumę transakcji dla tego dnia
        const dayTransactions = transactionsByDay[day] || [];
        let totalBalance = null;

        if (dayTransactions.length > 0) {
          totalBalance = dayTransactions.reduce((sum, transaction) => {
            const amount = parseFloat(transaction.amount);
            if (transaction.type === "income") {
              return sum + Math.abs(amount); // income zawsze dodatni
            } else if (transaction.type === "expense") {
              return sum - Math.abs(amount); // expense zawsze ujemny
            }
            return sum;
          }, 0);
          totalBalance = Math.round(totalBalance * 100) / 100; // Zaokrąglij do 2 miejsc po przecinku
        } else {
          // Jeśli brak transakcji, sprawdź czy dzień jest w przeszłości czy przyszłości
          const isPast =
            date < today && date.toDateString() !== todayDateString;
          totalBalance = isPast ? 0 : null;
        }

        const dayObj = {
          num: day,
          dayNum: dayWeekday + 1, // 1-7 (poniedziałek-niedziela)
          dayLabel: dayNames[date.getDay()], // Użyj getDay() bezpośrednio
          total_balance_this_day: totalBalance,
          previous_month: false,
          monthDay: day,
          monthNum: month + 1,
          year: year,
          transactions: dayTransactions,
        };

        currentWeek.push(dayObj);

        // Jeśli to niedziela, zakończ tydzień
        if (dayWeekday === 6) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      // Jeśli ostatni tydzień nie jest pełny, dodaj dni z następnego miesiąca
      if (currentWeek.length > 0) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        let nextDay = 1;

        while (currentWeek.length < 7) {
          const nextDate = new Date(nextYear, nextMonth, nextDay);
          let nextDayWeekday = nextDate.getDay();
          nextDayWeekday = nextDayWeekday === 0 ? 6 : nextDayWeekday - 1;

          // Sprawdź czy dzień jest w przeszłości czy przyszłości
          const isPast =
            nextDate < today && nextDate.toDateString() !== todayDateString;

          const nextDayObj = {
            num: nextDay,
            dayNum: nextDayWeekday + 1,
            dayLabel: dayNames[nextDate.getDay()],
            total_balance_this_day: isPast ? 0 : null, // 0 dla przeszłości, null dla przyszłości
            previous_month: true,
            monthDay: nextDay,
            monthNum: nextMonth + 1,
            year: nextYear,
            transactions: [],
          };

          currentWeek.push(nextDayObj);
          nextDay++;
        }
        weeks.push(currentWeek);
      }

      const monthObj = {
        monthLabel: monthNames[month],
        monthNum: month + 1,
        year: year,
        weeks: weeks,
      };

      out.push(monthObj);
    });

    // Sortuj według roku i miesiąca (najnowsze pierwsze)
    out.sort((a, b) => {
      // Znajdź rok dla każdego miesiąca
      const yearA =
        Object.keys(transactionsByMonth)
          .find((key) => {
            const [year, month] = key.split("-").map(Number);
            return month + 1 === a.monthNum;
          })
          ?.split("-")[0] || new Date().getFullYear();

      const yearB =
        Object.keys(transactionsByMonth)
          .find((key) => {
            const [year, month] = key.split("-").map(Number);
            return month + 1 === b.monthNum;
          })
          ?.split("-")[0] || new Date().getFullYear();

      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return b.monthNum - a.monthNum;
    });

    res.status(200).json(out);
  } catch (e) {
    console.log("Error getUserDataCalendar: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function getTransactionDailyGroupedByUserId(req, res) {
  try {
    const { userId } = req.params;

    const transactions = await sql`
            SELECT *
            FROM transactions
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
        `;

    function summarizeTransactionsByDate(transactions) {
      const dailySummary = {};
      let minTimestamp = Infinity;
      let maxTimestamp = 0;

      // Step 1: Process existing transactions and find min/max dates
      transactions.forEach((transaction) => {
        const timestamp = parseInt(transaction.created_at);
        minTimestamp = Math.min(minTimestamp, timestamp);
        maxTimestamp = Math.max(maxTimestamp, timestamp);

        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0); // Set to the beginning of the day for consistent grouping
        const formattedDate = date.toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const dailyTimestamp = date.getTime(); // Timestamp for 00:00:00 of the day

        if (!dailySummary[formattedDate]) {
          dailySummary[formattedDate] = {
            date: formattedDate,
            timestamp: dailyTimestamp,
            transactions: [],
            totalIncome: 0,
            totalExpense: 0,
            dailyBalance: 0,
          };
        }

        dailySummary[formattedDate].transactions.push(transaction);

        const amount = parseFloat(transaction.amount);

        if (
          transaction.type === "income" &&
          transaction.internal_operation == false
        ) {
          dailySummary[formattedDate].totalIncome += amount;
          dailySummary[formattedDate].dailyBalance += amount;
        } else if (
          transaction.type === "expense" &&
          transaction.internal_operation == false
        ) {
          dailySummary[formattedDate].totalExpense += amount;
          dailySummary[formattedDate].dailyBalance += amount;
        }
      });

      // Step 2: Determine the start and end dates for filling
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set today to 00:00:00 for accurate comparison

      let startDateToFill;
      if (minTimestamp === Infinity) {
        // No transactions at all
        startDateToFill = today; // If no transactions, start from today
      } else {
        const earliestTransactionDate = new Date(minTimestamp);
        earliestTransactionDate.setHours(0, 0, 0, 0);
        startDateToFill = earliestTransactionDate; // Start from the earliest transaction date
      }

      // Ensure endDateToFill is always at least today, and if transactions exist,
      // it should cover up to the latest transaction date if that's later than today.
      // Given your requirement to always include today, we can simplify this.
      const endDateToFill = today;

      const filledSummaries = {};

      // Loop from startDateToFill up to and including endDateToFill (today)
      for (
        let d = new Date(startDateToFill);
        d.getTime() <= endDateToFill.getTime();
        d.setDate(d.getDate() + 1)
      ) {
        const currentFormattedDate = d.toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const currentDailyTimestamp = new Date(d).setHours(0, 0, 0, 0);

        if (!dailySummary[currentFormattedDate]) {
          // If no transactions for this day, create an empty summary
          filledSummaries[currentFormattedDate] = {
            date: currentFormattedDate,
            timestamp: currentDailyTimestamp,
            transactions: [],
            totalIncome: 0,
            totalExpense: 0,
            dailyBalance: 0,
          };
        } else {
          // Otherwise, use the existing summary
          filledSummaries[currentFormattedDate] =
            dailySummary[currentFormattedDate];
        }
      }

      // Step 3: Convert the filledSummaries object to a sorted array
      return Object.values(filledSummaries).sort(
        (a, b) => a.timestamp - b.timestamp
      );
    }

    let output = summarizeTransactionsByDate(transactions).sort(
      (a, b) => b.timestamp - a.timestamp
    );

    res.status(200).json(output);
  } catch (e) {
    console.log("Error getting the daily grouped transaction: ", e);
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
            AND internal_operation = FALSE
        `;

    const prev_month_transactions = await sql`
        SELECT * from transactions
      WHERE user_id = ${userId}::varchar
      AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            AND internal_operation = FALSE
      `;

    let current_month_category_stats = {};
    let previous_month_category_stats = {};
    let total_expense = 0;
    let total_income = 0;
    let name = "";

    const parseStats = (transactions, outputObj) => {
      transactions.forEach((transaction) => {
        const { category, amount, type, internal_operation } = transaction;
        name = category;
        outputObj[category] = {
          type: type,
          name: name,
          ...(type == "expense" &&
            internal_operation == false && {
              percentage_of_total_expenses: null,
            }),
          ...(type == "income" &&
            internal_operation == false && {
              percentage_of_total_incomes: null,
            }),
          total_expense:
            type == "expense" && internal_operation == false
              ? (outputObj[category]?.total_expense ?? 0) + Math.abs(amount)
              : outputObj[category]?.total_expense ?? 0,
          total_income:
            type == "income" && internal_operation == false
              ? (outputObj[category]?.total_income ?? 0) + Math.abs(amount)
              : outputObj[category]?.total_income ?? 0,
        };
        if (type == "expense" && internal_operation == false)
          total_expense += Math.abs(amount);
        if (type == "income" && internal_operation == false)
          total_income += Math.abs(amount);
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

export async function returnTransaction(req, res) {
  try {
    const { userId } = req.params;
    const { transaction_id } = req.body;

    const delTransaction = await sql`
            DELETE FROM transactions WHERE id = ${transaction_id} RETURNING *
        `;
    if (delTransaction.length) {
      const updateBalanace = await sql`
                UPDATE users SET balance = balance + ${
                  -1 * Number(delTransaction[0].amount)
                } WHERE id = ${userId}
             RETURNING *`;

      if (updateBalanace.length) {
        res.status(200).json(delTransaction[0]);
      } else throw "err";
    } else throw "err";
  } catch (e) {
    console.log("Error returning the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}
