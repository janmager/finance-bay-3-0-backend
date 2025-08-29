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

    // Validate required environment variables
    const requiredVars = ['FIREBASE_TYPE', 'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
    }

    console.log('🔧 Initializing Firebase Admin SDK...');
    console.log('📋 Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('📧 Client Email:', process.env.FIREBASE_CLIENT_EMAIL);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    // Already initialized
    firebaseApp = admin.apps[0];
    console.log('✅ Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error);
  console.error('🔍 Check your environment variables and service account configuration');
  firebaseApp = null;
}

// Function to send notification to a single user
export async function sendNotificationToUser(userId, notification) {
  try {
    if (!firebaseApp) {
      console.error('❌ Firebase not initialized. Check environment variables and service account.');
      throw new Error('Firebase not initialized');
    }

    // Get user's FCM tokens from database
    const { sql } = await import('./db.js');
    const userResult = await sql`
      SELECT fcm_tokens FROM users WHERE id = ${userId}::varchar
    `;

    if (userResult.length === 0 || !userResult[0].fcm_tokens || userResult[0].fcm_tokens.length === 0) {
      console.log(`ℹ️ No FCM tokens found for user ${userId}`);
      return { success: false, message: 'No FCM tokens found for user' };
    }

    let fcmTokens = userResult[0].fcm_tokens;
    
    // Handle different data types (JSONB, string, array)
    if (typeof fcmTokens === 'string') {
      try {
        fcmTokens = JSON.parse(fcmTokens);
      } catch (parseError) {
        console.error(`❌ Invalid FCM tokens format for user ${userId}:`, parseError);
        return { success: false, message: 'Invalid FCM tokens format' };
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(fcmTokens)) {
      console.error(`❌ FCM tokens is not an array for user ${userId}:`, typeof fcmTokens);
      return { success: false, message: 'FCM tokens is not an array' };
    }

    console.log(`📱 Sending notification to user ${userId} with ${fcmTokens.length} FCM tokens`);

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
        console.log(`✅ Notification sent successfully to token: ${token.substring(0, 20)}...`);
      } catch (tokenError) {
        console.error(`❌ Error sending to token ${token.substring(0, 20)}...:`, tokenError.message);
        results.push({ token, success: false, error: tokenError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`📊 Notification results: ${successCount}/${totalCount} successful`);

    return {
      success: successCount > 0,
      message: `Sent to ${successCount}/${totalCount} devices`,
      results
    };

  } catch (error) {
    console.error('❌ Error sending notification:', error);
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
