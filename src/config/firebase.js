import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    // You'll need to add these environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    firebaseApp = admin.app();
    console.log('✅ Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error);
  firebaseApp = null;
}

// Function to send notification to a single user
export async function sendNotificationToUser(userId, notification) {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    // Get user's FCM tokens from database
    const { sql } = await import('./db.js');
    const userResult = await sql`
      SELECT fcm_tokens FROM users WHERE id = ${userId}::varchar
    `;

    if (userResult.length === 0 || !userResult[0].fcm_tokens || userResult[0].fcm_tokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}`);
      return { success: false, message: 'No FCM tokens found for user' };
    }

    let fcmTokens = userResult[0].fcm_tokens;
    
    // Handle different data types (JSONB, string, array)
    if (typeof fcmTokens === 'string') {
      try {
        fcmTokens = JSON.parse(fcmTokens);
      } catch (parseError) {
        console.log("Error parsing FCM tokens string:", parseError);
        return { success: false, message: 'Invalid FCM tokens format' };
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(fcmTokens)) {
      console.log(`FCM tokens is not an array: ${typeof fcmTokens}`);
      return { success: false, message: 'FCM tokens is not an array' };
    }

    const results = [];

    // Send notification to all user's devices
    for (const token of fcmTokens) {
      try {
        const message = {
          token: token,
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: notification.data || {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              priority: 'high'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        };

        const response = await admin.messaging().send(message);
        results.push({ token, success: true, messageId: response });
      } catch (tokenError) {
        console.error(`Error sending to token ${token}:`, tokenError);
        results.push({ token, success: false, error: tokenError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`Notification sent to ${successCount}/${totalCount} devices for user ${userId}`);

    return {
      success: successCount > 0,
      message: `Sent to ${successCount}/${totalCount} devices`,
      results
    };

  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Function to send notification to multiple users
export async function sendNotificationToMultipleUsers(userIds, notification) {
  const results = [];
  
  for (const userId of userIds) {
    try {
      const result = await sendNotificationToUser(userId, notification);
      results.push({ userId, ...result });
    } catch (error) {
      results.push({ userId, success: false, error: error.message });
    }
  }

  return results;
}

export { firebaseApp };
