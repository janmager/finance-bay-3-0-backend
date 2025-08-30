import { sql } from "../config/db.js";
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

// Funkcja do sprawdzania nadchodzących płatności i wysyłania powiadomień
export async function checkUpcomingPaymentsAndNotify() {
  try {
    console.log('🔔 Starting check for upcoming payments notifications...');

    const users = await sql`
      SELECT id FROM users
    `;

    console.log(`📱 Found ${users.length} users total`);

    for (const user of users) {
      try {
        console.log(`🔍 Processing user ${user.id}`);

        const userWithTokens = await sql`
          SELECT fcm_tokens FROM users WHERE id = ${user.id}
        `;

        if (!userWithTokens[0]?.fcm_tokens || userWithTokens[0].fcm_tokens.length === 0) {
          console.log(`ℹ️ User ${user.id} has no FCM tokens`);
          continue;
        }

        console.log(`✅ User ${user.id} has FCM tokens`);

        let incomingPayments = [];
        try {
          incomingPayments = await sql`
            SELECT * FROM incoming_payments
            WHERE user_id = ${user.id}
            AND deadline IS NOT NULL
            AND deadline != ''
            ORDER BY deadline ASC
          `;
          console.log(`📅 Found ${incomingPayments.length} incoming payments for user ${user.id}`);
        } catch (error) {
          console.log(`⚠️ Error fetching incoming payments for user ${user.id}:`, error.message);
        }

        let upcomingRecurrings = [];
        try {
          upcomingRecurrings = await sql`
            SELECT * FROM recurrings
            WHERE user_id = ${user.id}
            ORDER BY day_of_month ASC
          `;
          console.log(`🔄 Found ${upcomingRecurrings.length} recurring payments for user ${user.id}`);
        } catch (error) {
          console.log(`⚠️ Error fetching recurring payments for user ${user.id}:`, error.message);
        }

        const upcomingPayments = [];
        const today = new Date();

        // Process incoming payments with detailed logging
        console.log(`📋 Processing ${incomingPayments.length} incoming payments for user ${user.id}:`);
        for (const payment of incomingPayments) {
          if (payment.deadline) {
            try {
              // Parse deadline as timestamp (number) like in mobile app
              const deadlineDate = new Date(parseInt(payment.deadline));
              const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

              // Log all incoming payments with days until deadline
              const daysText = daysUntilDeadline === 0 ? 'dziś' :
                             daysUntilDeadline === 1 ? 'jutro' :
                             daysUntilDeadline > 0 ? `za ${daysUntilDeadline} dni` :
                             `przeszła o ${Math.abs(daysUntilDeadline)} dni`;
              
              console.log(`  💰 Incoming Payment: "${payment.title}" - ${payment.amount} PLN - ${daysText} (${payment.deadline})`);
              console.log(`    📅 Deadline date: ${deadlineDate.toLocaleDateString('pl-PL')}`);
              console.log(`    📊 Days until deadline: ${daysUntilDeadline}`);

              if (daysUntilDeadline >= 0 && daysUntilDeadline <= 5) {
                console.log(`    ✅ Adding to upcoming payments (within 5 days)`);
                upcomingPayments.push({
                  type: 'incoming_payment',
                  title: payment.title,
                  amount: payment.amount,
                  deadline: payment.deadline,
                  daysUntil: daysUntilDeadline,
                  description: payment.description
                });
              } else {
                console.log(`    ❌ Not adding (outside 5 days range)`);
              }
            } catch (dateError) {
              console.log(`⚠️ Invalid date format for payment ${payment.id}: ${payment.deadline}`);
              continue;
            }
          }
        }

        // Process recurring payments with detailed logging using same logic as UpcomingExpensesOverview
        console.log(`🔄 Processing ${upcomingRecurrings.length} recurring payments for user ${user.id}:`);
        for (const recurring of upcomingRecurrings) {
          try {
            // Calculate next payment date using same logic as UpcomingExpensesOverview
            const nextPaymentDate = (() => {
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              const currentDay = now.getDate();

              let nextDate = new Date(
                currentYear,
                currentMonth,
                recurring.day_of_month,
                0,
                0,
                0
              );

              // If the date has passed this month, set to next month
              if (nextDate <= now) {
                nextDate = new Date(
                  currentYear,
                  currentMonth + 1,
                  recurring.day_of_month,
                  0,
                  0,
                  0
                );
              }
              return nextDate.getTime();
            })();

            const daysRemaining = (() => {
              const now = new Date();
              const deadline = new Date(nextPaymentDate);
              return Math.ceil(
                (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
            })();

            // Log all recurring payments with days until next payment
            const daysText = daysRemaining === 0 ? 'dziś' :
                           daysRemaining === 1 ? 'jutro' :
                           daysRemaining > 0 ? `za ${daysRemaining} dni` :
                           `przeszła o ${Math.abs(daysRemaining)} dni`;
            
            console.log(`  🔄 Recurring Payment: "${recurring.title}" - ${recurring.amount} PLN - ${daysText} (dzień ${recurring.day_of_month})`);
            console.log(`    📅 Next payment date: ${new Date(nextPaymentDate).toLocaleDateString('pl-PL')}`);
            console.log(`    📊 Days remaining: ${daysRemaining}`);

            if (daysRemaining >= 0 && daysRemaining <= 5) {
              console.log(`    ✅ Adding to upcoming payments (within 5 days)`);
              upcomingPayments.push({
                type: 'recurring_payment',
                title: recurring.title,
                amount: recurring.amount,
                dayOfMonth: recurring.day_of_month,
                daysUntil: daysRemaining,
                description: `Płatność cykliczna - dzień ${recurring.day_of_month}`
              });
            } else {
              console.log(`    ❌ Not adding (outside 5 days range)`);
            }
          } catch (parseError) {
            console.log(`⚠️ Invalid day_of_month for recurring ${recurring.id}: ${recurring.day_of_month}`);
            continue;
          }
        }

        if (upcomingPayments.length > 0) {
          console.log(`📅 User ${user.id} has ${upcomingPayments.length} upcoming payments within 5 days:`);
          upcomingPayments.forEach(payment => {
            const daysText = payment.daysUntil === 0 ? 'dziś' :
                           payment.daysUntil === 1 ? 'jutro' :
                           `za ${payment.daysUntil} dni`;
            console.log(`  ⚠️ "${payment.title}" - ${payment.amount} PLN - ${daysText}`);
          });

          // Send individual notification for each upcoming payment
          for (const payment of upcomingPayments) {
            const daysText = payment.daysUntil === 0 ? 'dziś' :
                           payment.daysUntil === 1 ? 'jutro' :
                           `za ${payment.daysUntil} dni`;

            const notificationTitle = `Przypomnienie: ${payment.title}`;
            const notificationBody = `Płatność ${daysText}: ${parseFloat(payment.amount).toFixed(2)} PLN`;

            const notificationData = {
              type: 'upcoming_payment_reminder',
              payment_type: payment.type,
              payment_title: payment.title,
              payment_amount: parseFloat(payment.amount).toFixed(2),
              days_until: payment.daysUntil.toString(),
              payment_description: payment.description || '',
              timestamp: new Date().toISOString()
            };

            try {
              const result = await sendNotificationToUser(user.id, {
                title: notificationTitle,
                body: notificationBody,
                data: notificationData
              });

              if (result.success) {
                console.log(`✅ Individual reminder sent to user ${user.id} for "${payment.title}" - ${daysText}`);
              } else {
                console.log(`⚠️ Failed to send individual reminder to user ${user.id} for "${payment.title}": ${result.message}`);
              }
            } catch (notificationError) {
              console.error(`❌ Error sending individual reminder to user ${user.id} for "${payment.title}":`, notificationError);
            }
          }
        } else {
          console.log(`ℹ️ No upcoming payments for user ${user.id}`);
        }

      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError);
        continue;
      }
    }

    console.log('✅ Finished checking upcoming payments notifications');

  } catch (error) {
    console.error('❌ Error in checkUpcomingPaymentsAndNotify:', error);
  }
}

// Funkcja do testowania powiadomień o nadchodzących płatnościach dla konkretnego użytkownika
export async function testUpcomingPaymentsNotification(userId) {
  try {
    console.log(`🧪 Testing upcoming payments notification for user ${userId}`);
    
    // Sprawdź czy użytkownik ma FCM tokeny
    const user = await sql`
      SELECT id, fcm_tokens FROM users WHERE id = ${userId}::varchar
    `;

    if (user.length === 0) {
      console.log(`❌ User ${userId} not found`);
      return { success: false, message: 'User not found' };
    }

    if (!user[0].fcm_tokens || user[0].fcm_tokens.length === 0) {
      console.log(`❌ User ${userId} has no FCM tokens`);
      return { success: false, message: 'No FCM tokens found' };
    }

    // Symuluj nadchodzące płatności dla testu
    const testPayments = [
      {
        type: 'incoming_payment',
        title: 'Test Płatność',
        amount: 100.00,
        daysUntil: 2,
        description: 'Test płatności za 2 dni'
      },
      {
        type: 'recurring_payment',
        title: 'Test Płatność Cykliczna',
        amount: 50.00,
        daysUntil: 1,
        description: 'Test płatności cyklicznej jutro'
      }
    ];

    const notificationTitle = 'Test - Nadchodzące płatności';
    const notificationBody = `Masz ${testPayments.length} nadchodzące płatności testowe`;

    const notificationData = {
      type: 'upcoming_payments_test',
      payments_count: testPayments.length.toString(),
      payments: JSON.stringify(testPayments),
      timestamp: new Date().toISOString(),
      test: 'true'
    };

    // Wyślij testowe powiadomienie
    const result = await sendNotificationToUser(userId, {
      title: notificationTitle,
      body: notificationBody,
      data: notificationData
    });

    console.log(`✅ Test notification result for user ${userId}:`, result);
    return result;

  } catch (error) {
    console.error(`❌ Error in testUpcomingPaymentsNotification for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}
