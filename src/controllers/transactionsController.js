import { sql } from "../config/db.js";
import crypto from "crypto";
import { sendNotificationToUser } from "../config/firebase.js";

// Tłumaczenia kategorii
const CATEGORY_TRANSLATIONS = {
  // Wydatki
  food: "Jedzenie",
  shopping: "Zakupy",
  transportation: "Transport",
  entertainment: "Rozrywka",
  bills: "Rachunki",
  health: "Zdrowie i uroda",
  house: "Dom",
  clothes: "Odzież",
  car: "Samochód",
  education: "Edukacja",
  gifts: "Prezenty",
  animals: "Zwierzęta",
  recurring: "Płatność cykliczna",
  travel: "Podróże",
  overdue: "Zaległa płatność",
  "incoming-payments": "Zaplanowany wydatek",
  other: "Inne",
  
  // Przychody
  salary: "Wypłata",
  exchange: "Wymiana walut",
  bonus: "Premia",
  sell: "Sprzedaż",
  freelance: "Freelance / Zlecenia",
  returning: "Zwrot",
  investments: "Inwestycje",
  gifts_received: "Prezent",
  "incoming-incomes": "Zaplanowany przychód",
  
  // Wewnętrzne
  savings: "Oszczędności",
  "foreign-currency": "Waluty obce",
  "invest-goal": "Cel oszczędnościowy"
};

// Funkcja do tłumaczenia kategorii
const translateCategory = (category) => {
  return CATEGORY_TRANSLATIONS[category] || category;
};

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
      return res.status(400).json({ message: "User ID is required." });
    }

    // Pobierz transakcje income z current month (tylko z internal=false)
    const current_month_income_transactions = await sql`
      SELECT * from transactions
      WHERE user_id = ${userId}::varchar
      AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE)
      AND internal_operation = FALSE
      AND type = 'income'
    `;

    // Pobierz transakcje expense z current month (tylko z internal=false)
    const current_month_expense_transactions = await sql`
      SELECT * from transactions
      WHERE user_id = ${userId}::varchar
      AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE)
      AND internal_operation = FALSE
      AND type = 'expense'
    `;

    // Pobierz transakcje income z previous month (tylko z internal=false)
    const prev_month_income_transactions = await sql`
      SELECT * from transactions
      WHERE user_id = ${userId}::varchar
      AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND internal_operation = FALSE
      AND type = 'income'
    `;

    // Pobierz transakcje expense z previous month (tylko z internal=false)
    const prev_month_expense_transactions = await sql`
      SELECT * from transactions
      WHERE user_id = ${userId}::varchar
      AND DATE_TRUNC('month', to_timestamp(created_at::bigint / 1000)) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND internal_operation = FALSE
      AND type = 'expense'
    `;

    let current_month_income_stats = {};
    let current_month_expense_stats = {};
    let previous_month_income_stats = {};
    let previous_month_expense_stats = {};
    let total_income_current = 0;
    let total_expense_current = 0;
    let total_income_previous = 0;
    let total_expense_previous = 0;

    const parseStats = (transactions, outputObj, type) => {
      let totalAmount = 0;
      
      transactions.forEach((transaction) => {
        const { category, amount } = transaction;
        
        // Inicjalizuj kategorię jeśli nie istnieje
        if (!outputObj[category]) {
          outputObj[category] = {
            name: category,
            type: type,
            total_amount: 0,
            percentage_of_total: 0,
            transactions: [] // Dodaj tablicę transakcji
          };
        }
        
        // Dodaj kwotę do kategorii
        outputObj[category].total_amount += Math.abs(amount);
        
        // Dodaj transakcję do listy
        outputObj[category].transactions.push({
          id: transaction.id,
          title: transaction.title,
          amount: Math.abs(amount),
          created_at: transaction.created_at,
          note: transaction.note,
          day: new Date(parseInt(transaction.created_at)).getDate(),
          category: transaction.category,
          type: transaction.type,
          internal_operation: transaction.internal_operation
        });
        
        // Dodaj do całkowitej kwoty
        totalAmount += Math.abs(amount);
      });

      // Oblicz procenty dla każdej kategorii
      Object.keys(outputObj).forEach((category) => {
        if (totalAmount > 0) {
          outputObj[category].percentage_of_total = Number(
            ((outputObj[category].total_amount / totalAmount) * 100).toFixed(2)
          );
        } else {
          outputObj[category].percentage_of_total = 0;
        }
        
        // Sortuj transakcje według daty (najnowsze pierwsze)
        outputObj[category].transactions.sort((a, b) => parseInt(b.created_at) - parseInt(a.created_at));
      });
      
      return { stats: outputObj, total: totalAmount };
    };

    // Przetwórz dane dla current month - income
    const current_income_result = parseStats(
      current_month_income_transactions,
      current_month_income_stats,
      'income'
    );
    current_month_income_stats = current_income_result.stats;
    total_income_current = current_income_result.total;

    // Przetwórz dane dla current month - expense
    const current_expense_result = parseStats(
      current_month_expense_transactions,
      current_month_expense_stats,
      'expense'
    );
    current_month_expense_stats = current_expense_result.stats;
    total_expense_current = current_expense_result.total;

    // Przetwórz dane dla previous month - income
    const previous_income_result = parseStats(
      prev_month_income_transactions,
      previous_month_income_stats,
      'income'
    );
    previous_month_income_stats = previous_income_result.stats;
    total_income_previous = previous_income_result.total;

    // Przetwórz dane dla previous month - expense
    const previous_expense_result = parseStats(
      prev_month_expense_transactions,
      previous_month_expense_stats,
      'expense'
    );
    previous_month_expense_stats = previous_expense_result.stats;
    total_expense_previous = previous_expense_result.total;

    // Oblicz zmiany procentowe względem poprzedniego miesiąca dla income
    Object.keys(current_month_income_stats).forEach((category) => {
      if (current_month_income_stats[category]) {
        let change = null;
        
        const currentAmount = current_month_income_stats[category].total_amount;
        const previousAmount = previous_month_income_stats[category]?.total_amount || 0;
        
        if (previousAmount > 0) {
          change = Number(
            (((currentAmount - previousAmount) / previousAmount) * 100).toFixed(2)
          );
        } else if (currentAmount > 0) {
          change = 100; // 100% wzrost jeśli poprzedni miesiąc miał 0
        }
        
        current_month_income_stats[category] = {
          ...current_month_income_stats[category],
          change_percentage_to_previous_month: change,
        };
      }
    });

    // Oblicz zmiany procentowe względem poprzedniego miesiąca dla expense
    Object.keys(current_month_expense_stats).forEach((category) => {
      if (current_month_expense_stats[category]) {
        let change = null;
        
        const currentAmount = current_month_expense_stats[category].total_amount;
        const previousAmount = previous_month_expense_stats[category]?.total_amount || 0;
        
        if (previousAmount > 0) {
          change = Number(
            (((currentAmount - previousAmount) / previousAmount) * 100).toFixed(2)
          );
        } else if (currentAmount > 0) {
          change = 100; // 100% wzrost jeśli poprzedni miesiąc miał 0
        }
        
        current_month_expense_stats[category] = {
          ...current_month_expense_stats[category],
          change_percentage_to_previous_month: change,
        };
      }
    });

    res.status(200).json({
      income: {
        current: current_month_income_stats,
        previous: previous_month_income_stats,
        totals: {
          current_month: total_income_current,
          previous_month: total_income_previous
        }
      },
      expense: {
        current: current_month_expense_stats,
        previous: previous_month_expense_stats,
        totals: {
          current_month: total_expense_current,
          previous_month: total_expense_previous
        }
      }
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
      created_at,
    } = req.body;

    if (!title || !user_id || amount === undefined || !category) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const transactionAmount =
      transaction_type === "expense" ? -Math.abs(amount) : Math.abs(amount);

    const id = crypto.randomUUID();
    const transaction = await sql`
        INSERT INTO transactions (id, user_id, title, amount, category, created_at, type, internal_operation, note) 
        VALUES (${id}, ${user_id}, ${title}, ${transactionAmount}, ${category}, ${created_at ? created_at : new Date().valueOf()}, ${transaction_type}, ${internal_operation}, ${note})
            RETURNING *
        `;

    if (transaction_type === "expense" || transaction_type === "income") {
      await sql`
                UPDATE users SET balance = balance + ${transactionAmount} WHERE id = ${user_id}
            `;

      // Log the balance update to balances_logs
      const user = await sql`
    SELECT balance FROM users WHERE id = ${user_id}
  `;

      if (user.length > 0) {
        const logId = crypto.randomUUID();
        await sql`
      INSERT INTO balances_logs (id, user_id, balance, created_at)
      VALUES (${logId}, ${user_id}, ${Number(
          user[0].balance
        )}, ${new Date().valueOf()})
    `;
      }
    }

    // Send push notification to user
    try {
      const translatedCategory = translateCategory(category);
      const notification = {
        title: `Nowa transakcja: ${title}`,
        body: `${transaction_type === 'expense' ? 'Wydatek' : 'Przychód'}: ${Math.abs(amount).toFixed(2)} PLN - ${translatedCategory}`,
        data: {
          transaction_id: id,
          transaction_type: transaction_type,
          amount: amount.toString(),
          category: category,
          category_translated: translatedCategory,
          timestamp: new Date().toISOString()
        }
      };

      await sendNotificationToUser(user_id, notification);
      console.log(`✅ Push notification sent for transaction ${id}`);
    } catch (notificationError) {
      console.log("⚠️ Error sending push notification:", notificationError);
      // Don't fail the transaction if notification fails
    }

    res.status(201).json(transaction[0]);
  } catch (e) {
    console.log("Error creating the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function deleteTransaction(req, res) {
  try {
    const { id, userId } = req.params;
    const result = await sql`
            DELETE FROM transactions WHERE id = ${id} AND user_id = ${userId} RETURNING *
        `;

    if (result.length === 0) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    const deletedTransaction = result[0];
    const { user_id, amount } = deletedTransaction;

    // Correctly update balance: if amount is positive (income), subtract it; if negative (expense), add it back
    await sql`
            UPDATE users SET balance = balance - ${amount} WHERE id = ${user_id}
        `;

    // Log the balance update to balances_logs
    const user = await sql`
      SELECT balance FROM users WHERE id = ${user_id}
    `;

    if (user.length > 0) {
      const logId = crypto.randomUUID();
      await sql`
        INSERT INTO balances_logs (id, user_id, balance, created_at)
        VALUES (${logId}, ${user_id}, ${Number(
        user[0].balance
      )}, ${new Date().valueOf()})
    `;
      }

    res.status(200).json({ message: "Transaction deleted successfully." });
  } catch (e) {
    console.log("Error deleting the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}

export async function updateTransaction(req, res) {
  try {
    const { id, userId } = req.params;
    const { title, note, category } = req.body;

    if (!title && !note && !category) {
      return res.status(400).json({ message: "At least one field (title, note, or category) is required." });
    }

    // Clean and validate input values
    const cleanTitle = title && title.trim() !== '' ? title.trim() : null;
    const cleanNote = note && note.trim() !== '' ? note.trim() : null;
    const cleanCategory = category && category.trim() !== '' ? category.trim() : null;

    if (!cleanTitle && !cleanNote && !cleanCategory) {
      return res.status(400).json({ message: "At least one field (title, note, or category) must have a valid value." });
    }

    // Build dynamic update query based on provided fields
    let result;
    
    if (cleanTitle && cleanNote && cleanCategory) {
      // All three fields provided
      result = await sql`
        UPDATE transactions 
        SET title = ${cleanTitle}, note = ${cleanNote}, category = ${cleanCategory}
        WHERE id = ${id} AND user_id = ${userId} 
        RETURNING *
      `;
    } else if (cleanTitle && cleanNote) {
      // Both title and note provided
      result = await sql`
        UPDATE transactions 
        SET title = ${cleanTitle}, note = ${cleanNote} 
        WHERE id = ${id} AND user_id = ${userId} 
        RETURNING *
      `;
    } else if (cleanTitle && cleanCategory) {
      // Title and category provided
      result = await sql`
        UPDATE transactions 
        SET title = ${cleanTitle}, category = ${cleanCategory}
        WHERE id = ${id} AND user_id = ${userId} 
        RETURNING *
      `;
    } else if (cleanNote && cleanCategory) {
      // Note and category provided
      result = await sql`
        UPDATE transactions 
        SET note = ${cleanNote}, category = ${cleanCategory}
        WHERE id = ${id} AND user_id = ${userId} 
        RETURNING *
      `;
    } else if (cleanTitle) {
      // Only title provided
      result = await sql`
        UPDATE transactions 
        SET title = ${cleanTitle} 
        WHERE id = ${id} AND user_id = ${userId} 
        RETURNING *
      `;
    } else if (cleanNote) {
      // Only note provided
      result = await sql`
        UPDATE transactions 
        SET note = ${cleanNote} 
        WHERE id = ${id} AND user_id = ${userId} 
        RETURNING *
      `;
    } else if (cleanCategory) {
      // Only category provided
      result = await sql`
        UPDATE transactions 
        SET category = ${cleanCategory}
        WHERE id = ${id} AND user_id = ${userId} 
        RETURNING *
      `;
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    res.status(200).json(result[0]);
  } catch (e) {
    console.log("Error updating transaction: ", e);
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
            DELETE FROM transactions WHERE id = ${transaction_id} AND user_id = ${userId} RETURNING *
        `;
    if (delTransaction.length) {
      const updateBalanace = await sql`
                UPDATE users SET balance = balance + ${
                  -1 * Number(delTransaction[0].amount)
                } WHERE id = ${userId}
             RETURNING *`;

      if (updateBalanace.length) {
        // Log the balance update to balances_logs
        const logId = crypto.randomUUID();
        await sql`
          INSERT INTO balances_logs (id, user_id, balance, created_at)
          VALUES (${logId}, ${userId}, ${Number(
          updateBalanace[0].balance
        )}, ${new Date().valueOf()})
        `;

        res.status(200).json(delTransaction[0]);
      } else throw "err";
    } else throw "err";
  } catch (e) {
    console.log("Error returning the transaction: ", e);
    res.status(500).json({ message: "Something went wrong." });
  }
}
