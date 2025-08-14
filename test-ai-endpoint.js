import fs from 'fs';
import FormData from 'form-data';

// Test script for the AI endpoint
// Make sure to install form-data: npm install form-data

const testAIEndpoint = async () => {
  const form = new FormData();
  
  // Add text content
  form.append('text', 'What do you see in this image?');
  
  // Add image file (replace with actual image path)
  // form.append('image', fs.createReadStream('./test-image.jpg'));
  
  try {
    const response = await fetch('http://localhost:5001/api/ai', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
      },
    });
    
    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Uncomment the line below to run the test
// testAIEndpoint();
