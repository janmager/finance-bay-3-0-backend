import fetch from 'node-fetch';

const testFCMToken = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/users/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'test-user-123',
        fcm_token: 'test-fcm-token-456'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error testing FCM token endpoint:', error);
  }
};

const testBodyParsing = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/users/test-body', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: 'data',
        number: 123
      })
    });

    const data = await response.json();
    console.log('Test body response status:', response.status);
    console.log('Test body response data:', data);
  } catch (error) {
    console.error('Error testing body parsing:', error);
  }
};

console.log('Testing FCM token endpoint...');
await testFCMToken();

console.log('\nTesting body parsing...');
await testBodyParsing();
