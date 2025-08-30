import { sql } from "../config/db.js";
import { sendNotificationToUser } from "../config/firebase.js";

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

        for (const payment of incomingPayments) {
          if (payment.deadline) {
            try {
              const deadlineDate = new Date(payment.deadline);
              const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

              if (daysUntilDeadline >= 0 && daysUntilDeadline <= 3) {
                upcomingPayments.push({
                  type: 'incoming_payment',
                  title: payment.title,
                  amount: payment.amount,
                  deadline: payment.deadline,
                  daysUntil: daysUntilDeadline,
                  description: payment.description
                });
              }
            } catch (dateError) {
              console.log(`⚠️ Invalid date format for payment ${payment.id}: ${payment.deadline}`);
              continue;
            }
          }
        }

        const currentMonth = `${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getFullYear().toString().slice(-2)}`;

        for (const recurring of upcomingRecurrings) {
          try {
            if (recurring.last_month_paid !== currentMonth) {
              const daysUntilPayment = parseInt(recurring.day_of_month) - today.getDate();

              if (daysUntilPayment >= 0 && daysUntilPayment <= 3) {
                upcomingPayments.push({
                  type: 'recurring_payment',
                  title: recurring.title,
                  amount: recurring.amount,
                  dayOfMonth: recurring.day_of_month,
                  daysUntil: daysUntilPayment,
                  description: `Płatność cykliczna - dzień ${recurring.day_of_month}`
                });
              }
            }
          } catch (parseError) {
            console.log(`⚠️ Invalid day_of_month for recurring ${recurring.id}: ${recurring.day_of_month}`);
            continue;
          }
        }

        if (upcomingPayments.length > 0) {
          console.log(`📅 User ${user.id} has ${upcomingPayments.length} upcoming payments`);

          let notificationTitle = 'Nadchodzące płatności';
          let notificationBody = '';

          if (upcomingPayments.length === 1) {
            const payment = upcomingPayments[0];
            const daysText = payment.daysUntil === 0 ? 'dziś' :
                           payment.daysUntil === 1 ? 'jutro' :
                           `za ${payment.daysUntil} dni`;

            notificationTitle = `Płatność ${daysText}`;
            notificationBody = `${payment.title}: ${payment.amount} PLN`;
          } else {
            notificationBody = `Masz ${upcomingPayments.length} nadchodzące płatności`;
          }

          const notificationData = {
            type: 'upcoming_payments',
            payments_count: upcomingPayments.length.toString(),
            payments: JSON.stringify(upcomingPayments.map(p => ({
              type: p.type,
              title: p.title,
              amount: p.amount.toString(),
              days_until: p.daysUntil.toString()
            }))),
            timestamp: new Date().toISOString()
          };

          try {
            const result = await sendNotificationToUser(user.id, {
              title: notificationTitle,
              body: notificationBody,
              data: notificationData
            });

            if (result.success) {
              console.log(`✅ Notification sent to user ${user.id} for ${upcomingPayments.length} upcoming payments`);
            } else {
              console.log(`⚠️ Failed to send notification to user ${user.id}: ${result.message}`);
            }
          } catch (notificationError) {
            console.error(`❌ Error sending notification to user ${user.id}:`, notificationError);
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
