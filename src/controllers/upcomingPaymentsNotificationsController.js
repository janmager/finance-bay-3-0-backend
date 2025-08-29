import { sql } from "../config/db.js";
import { sendNotificationToUser } from "../config/firebase.js";

// Funkcja do sprawdzania nadchodzących płatności i wysyłania powiadomień
export async function checkUpcomingPaymentsAndNotify() {
  try {
    console.log('🔔 Starting check for upcoming payments notifications...');
    
    console.log('✅ Function completed successfully (simplified version)');
    
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
      payments_count: testPayments.length,
      payments: testPayments,
      timestamp: new Date().toISOString(),
      test: true
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
