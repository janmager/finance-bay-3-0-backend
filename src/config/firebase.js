import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

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

// Function to send notification using Expo Push API (HTTP/2)
async function sendExpoPushNotification(tokens, notification) {
  const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  
  // Prepare messages according to Expo Push API format
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    priority: 'high',
    channelId: 'default'
  }));

  try {
    console.log(`📤 Sending ${messages.length} notifications to Expo Push API`);
    
    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo Push API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📋 Expo Push API response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error sending Expo push notification:', error);
    throw error;
  }
}

// Function to check push receipts (for error handling)
async function checkPushReceipts(receiptIds) {
  if (!receiptIds || receiptIds.length === 0) return [];
  
  const expoReceiptUrl = 'https://exp.host/--/api/v2/push/getReceipts';
  
  try {
    const response = await fetch(expoReceiptUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: receiptIds
      }),
    });

    if (!response.ok) {
      throw new Error(`Expo Receipt API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📋 Push receipts:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error checking push receipts:', error);
    return { errors: [{ message: error.message }] };
  }
}

// Function to send notification to a single user
export async function sendNotificationToUser(userId, notification) {
  try {
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

    console.log(`📱 Sending notification to user ${userId} with ${fcmTokens.length} tokens`);

    // Separate Expo tokens from FCM tokens
    const expoTokens = fcmTokens.filter(token => token.startsWith('ExponentPushToken['));
    const fcmTokensOnly = fcmTokens.filter(token => !token.startsWith('ExponentPushToken['));

    const results = [];
    const receiptIds = [];

    // Send to Expo tokens using Expo Push API
    if (expoTokens.length > 0) {
      try {
        console.log(`📤 Sending to ${expoTokens.length} Expo tokens`);
        const expoResult = await sendExpoPushNotification(expoTokens, notification);
        
        // Handle Expo Push API response
        if (expoResult.data && Array.isArray(expoResult.data)) {
          expoResult.data.forEach((result, index) => {
            if (result.status === 'ok') {
              results.push({ token: expoTokens[index], success: true, messageId: result.id });
              receiptIds.push(result.id);
              console.log(`✅ Expo notification sent successfully to token: ${expoTokens[index].substring(0, 20)}...`);
            } else {
              results.push({ token: expoTokens[index], success: false, error: result.message });
              console.error(`❌ Expo notification failed for token ${expoTokens[index].substring(0, 20)}...:`, result.message);
            }
          });
        } else if (expoResult.errors) {
          console.error('❌ Expo Push API errors:', expoResult.errors);
          expoTokens.forEach(token => {
            results.push({ token, success: false, error: expoResult.errors[0]?.message || 'Expo API error' });
          });
        }
      } catch (expoError) {
        console.error('❌ Error sending Expo notifications:', expoError);
        expoTokens.forEach(token => {
          results.push({ token, success: false, error: expoError.message });
        });
      }
    }

    // Send to FCM tokens using Firebase Admin SDK (if available)
    if (fcmTokensOnly.length > 0 && firebaseApp) {
      console.log(`📤 Sending to ${fcmTokensOnly.length} FCM tokens`);
      
      for (const token of fcmTokensOnly) {
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
          console.log(`✅ FCM notification sent successfully to token: ${token.substring(0, 20)}...`);
        } catch (tokenError) {
          console.error(`❌ Error sending to FCM token ${token.substring(0, 20)}...:`, tokenError.message);
          results.push({ token, success: false, error: tokenError.message });
        }
      }
    } else if (fcmTokensOnly.length > 0 && !firebaseApp) {
      console.log(`⚠️ FCM tokens found but Firebase not initialized. Skipping ${fcmTokensOnly.length} FCM tokens.`);
      fcmTokensOnly.forEach(token => {
        results.push({ token, success: false, error: 'Firebase not initialized' });
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`📊 Notification results: ${successCount}/${totalCount} successful`);

    // Check push receipts after 15 minutes (in production, this should be done asynchronously)
    if (receiptIds.length > 0) {
      console.log(`📋 Will check ${receiptIds.length} push receipts in 15 minutes`);
      // In production, you should schedule this check for later
      // setTimeout(async () => {
      //   const receipts = await checkPushReceipts(receiptIds);
      //   console.log('📋 Push receipts checked:', receipts);
      // }, 15 * 60 * 1000);
    }

    return {
      success: successCount > 0,
      message: `Sent to ${successCount}/${totalCount} devices`,
      results,
      receiptIds
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
      console.error(`❌ Error sending notification to user ${userId}:`, error);
      results.push({ userId, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`📊 Multi-user notification results: ${successCount}/${results.length} successful`);
  
  return {
    success: successCount > 0,
    message: `Sent to ${successCount}/${results.length} users`,
    results
  };
}

export { firebaseApp };
