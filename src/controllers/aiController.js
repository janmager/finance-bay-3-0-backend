import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

export const processAIRequest = async (req, res) => {
  try {
    const { text } = req.body;
    const imageFile = req.file;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Convert image buffer to base64
    const imageBuffer = imageFile.buffer;
    const base64Image = imageBuffer.toString('base64');

    // Prepare the message for OpenAI
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: text
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageFile.mimetype};base64,${base64Image}`
            }
          }
        ]
      }
    ];

    console.log('Sending request to OpenAI with:');
    console.log('Text:', text);
    console.log('Image:', imageFile.originalname, `(${imageFile.mimetype})`);

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0].message.content;
    
    console.log('OpenAI Response:', aiResponse);

    res.json({
      success: true,
      response: aiResponse,
      model: response.model,
      usage: response.usage
    });

  } catch (error) {
    console.error('Error processing AI request:', error);
    res.status(500).json({ 
      error: 'Failed to process AI request',
      details: error.message 
    });
  }
};
