import OpenAI from 'openai';
import dotenv from 'dotenv';
import { sql } from '../config/db.js';
import { createTransaction } from '../controllers/transactionsController.js';
import { addAILog } from './aiLogsController.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

export const processAIRequest = async (req, res) => {
  try {
    const { text, user_id } = req.body;
    
    // Find the first image file in req.files
    const imageFile = req.files && req.files.length > 0 ? req.files[0] : null;

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists and has premium access
    const userCheck = await sql`
      SELECT premium FROM users WHERE id = ${user_id}
    `;

    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userCheck[0].premium) {
      return res.status(403).json({ error: 'Premium access required' });
    }

    // Verify it's an image file
    if (!imageFile.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Convert image buffer to base64
    const imageBuffer = imageFile.buffer;
    const base64Image = imageBuffer.toString('base64');

    // Determine the text content to send to OpenAI
    let textContent;
    if (text && text.startsWith('!')) {
      // If text starts with "!", use it as is
      textContent = text;
    } else {
      // If text doesn't start with "!" or is empty, provide financial analysis instructions
      textContent = `Przeanalizuj plik pod kątem finansowym. 

Informacje zwrotne jakie mnie interesują to:
- tytuł transakcji
- kwota transakcji  
- kategoria transakcji
- opis transakcji (maksymalnie 300 znaków)
- data transakcji

Zazwyczaj otrzymasz zdjęcie: paragonu, screen ekranu telefonu na którym gdzieś znajduje się informacja o płatności, zdjęcie faktury.

Zawsze staraj się wybrać (znaleźć na grafice) takie informacje aby były odpowiednie do informacji które oczekuje na twojej informacji zwrotnej.

Odpowiedź chcę otrzymać w formacie JSON z następującą strukturą:
{
  "title": "nazwa transakcji",
  "amount": "kwota",
  "category": "kategoria",
  "description": "opis (max 300 znaków)",
  "created_at": "data (timestamp)",
  "percent_title": 85,
  "percent_amount": 95,
  "percent_category": 70,
  "percent_description": 60,
  "percent_created_at": 90
}

Dla parametru created_at jeśli masz dane (odczytane z grafiki) to podaj datę w formacie timestamp.
Dla parametru category masz dostępne kategorie: food, shopping, transportation, entertainment, bills, health, house, clothes, car, education, gifts, animals, recurring, travel, overdue, incoming-payments, other.
Dla parametru title jeśli masz dane to podaj nazwę sklepu.
Dla parametru description jeśli masz dane to podaj nazwy kupionych produktów (ich główne nazwy bez szczegółów), wypisane w liście.
Parametry pewności (pewnosc_*) to wartości procentowe (0-100) które zawierają informacje jak bardzo jesteś pewny/zgodny co do poprawności zaczytania wartości z grafiki. Jeśli nie jesteś czegoś pewien/nie masz takich danych ustaw wartość parametru na null, a wartości procentowe na 0.`;
    }

    // Prepare the message for OpenAI
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: textContent
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

    console.log('Sending request to OpenAI...');
    console.log('User ID:', user_id);
    // console.log('Text content:', textContent);
    console.log('Image file:', imageFile.originalname, `(${imageFile.mimetype})`);

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000,
      response_format: { type: "json_object" }, // Force JSON response
    });

    const aiResponse = response.choices[0].message.content;
    
    console.log(`OpenAI Response: (typeof ${typeof aiResponse}) (usage: ${response.usage.total_tokens} tokens)`, aiResponse);

    // Log the AI response to the database
    try {
      const logPayload = {
        response: aiResponse,
        user_id: user_id,
        url: '/api/ai'
      };
      
      // Create a mock request and response for logging
      const mockLogReq = { body: logPayload };
      const mockLogRes = {
        status: (code) => ({
          json: (data) => {
            if (code === 201) {
              console.log('AI log saved successfully:', data);
            }
          }
        }),
        json: (data) => {
          console.log('AI log save failed:', data);
        }
      };
      
      await addAILog(mockLogReq, mockLogRes);
    } catch (logError) {
      console.log('Error saving AI log:', logError);
      // Don't fail the main request if logging fails
    }

    // Check if AI response is valid
    if (!aiResponse) {
      console.log('OpenAI returned null response');
      return res.json({
        success: false,
        error: 'OpenAI returned null response',
        model: response.model,
        usage: response.usage
      });
    }

    // Try to parse the AI response and create transaction if valid
    let transactionCreated = false;
    let transactionData = null;
    
    try {
      const parsedResponse = JSON.parse(aiResponse);
      console.log('Parsed AI response:', parsedResponse);
      
      // Check if response contains required fields for transaction
      if (parsedResponse.title && parsedResponse.amount && parsedResponse.category) {
        console.log('Valid transaction data found, creating transaction...');
        
        // Prepare transaction data
        const transactionAmount = Math.abs(parseFloat(parsedResponse.amount));
        const transactionTitle = parsedResponse.title;
        const transactionCategory = parsedResponse.category;
        const transactionDescription = parsedResponse.description || '';
        const transactionDate = parsedResponse.created_at ? new Date(parsedResponse.created_at).valueOf() : new Date().valueOf();
        
        // Create transaction using the createTransaction function directly
        const transactionPayload = {
          user_id: user_id,
          title: transactionTitle,
          amount: transactionAmount,
          category: transactionCategory,
          note: transactionDescription,
          transaction_type: 'expense',
          internal_operation: false
        };
        
        console.log('Transaction payload:', transactionPayload);
        
        // Create a mock request and response object for the createTransaction function
        const mockReq = {
          body: transactionPayload
        };
        
        const mockRes = {
          status: (code) => ({
            json: (data) => {
              if (code === 201) {
                transactionData = data;
                transactionCreated = true;
                console.log('Transaction created successfully:', transactionData);
              }
            }
          }),
          json: (data) => {
            // Handle error response
            console.log('Transaction creation failed:', data);
          }
        };
        
        // Call createTransaction function directly
        await createTransaction(mockReq, mockRes);
        
      } else {
        console.log('Missing required fields for transaction:', {
          hasTitle: !!parsedResponse.title,
          hasAmount: !!parsedResponse.amount,
          hasCategory: !!parsedResponse.category
        });
      }
    } catch (parseError) {
      console.log('Error parsing AI response or creating transaction:', parseError);
      console.log('Raw AI response that failed to parse:', aiResponse);
    }
    
    res.json({
      success: true,
      response: aiResponse,
      model: response.model,
      usage: response.usage,
      transactionCreated,
      transactionData
    });

  } catch (error) {
    console.error('Error processing AI request:', error);
    res.status(500).json({ 
      error: 'Failed to process AI request',
      details: error.message 
    });
  }
};
