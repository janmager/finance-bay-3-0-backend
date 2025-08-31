import OpenAI from 'openai';
import dotenv from 'dotenv';
import crypto from 'crypto';
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
    
    // Find the first file in req.files
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'File is required' });
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

    // Verify it's an image or PDF file
    if (!uploadedFile.mimetype.startsWith('image/') && uploadedFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only image files and PDF files are allowed' });
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (uploadedFile.size > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    // Convert file buffer to base64
    const fileBuffer = uploadedFile.buffer;
    const base64File = fileBuffer.toString('base64');

    // Determine the text content to send to OpenAI
    let textContent;
    if (text && text.startsWith('!')) {
      // If text starts with "!", use it as is
      textContent = text;
    } else {
      // If text doesn't start with "!" or is empty, provide financial analysis instructions
      textContent = `Przeanalizuj ten dokument finansowy (rachunek, paragon, faktura, powiadomienie o płatności, screen potwierdzenia płatności itp.) i wyciągnij TYLKO informacje, które faktycznie widzisz w dokumencie.

WAŻNE: NIE WYMYŚLAJ żadnych informacji! Analizuj tylko to, co jest napisane/widoczne w dokumencie.

INSTRUKCJE:
1. KWOTA: Znajdź kwotę w dokumencie. Jeśli nie widzisz jasnej kwoty, ustaw percent_amount na 0 i amount na null. Szukaj kwot w różnych formatach (np. "100,00 zł", "100 PLN", "100.00", "100 zł" itp.). Uwzględnij tylko kwotę końcową do zapłaty.

2. DATA: Jeśli widzisz datę w dokumencie, podaj ją w formacie timestamp (mili sekundy). Jeśli data nie ma roku, zakładaj że to aktualny rok (${new Date().getFullYear()}). Jeśli nie widzisz daty, ustaw percent_created_at na 0 i created_at na null. Odszukaj dokładnie datę w dokumencie, zazwyczaj ona jest, nie zmyślaj daty.

3. TYTUŁ: Podaj nazwę sklepu/firmy/serwisu, którą widzisz w dokumencie (bez rozszerzeń jak "Sp. z o.o.", "Ltd" itp.). Jeśli nie widzisz nazwy, ustaw percent_title na 0 i title na null.

4. KATEGORIA: Na podstawie tego co widzisz w dokumencie, wybierz najbardziej odpowiednią kategorię z listy.

5. OPIS: Podaj produkty/usługi, które widzisz w dokumencie. Maksymalnie 300 znaków. Jeśli nie widzisz szczegółów, ustaw percent_description na 0 i description na null.

Dostępne kategorie: food, shopping, transportation, entertainment, bills, health, house, clothes, car, education, gifts, animals, recurring, travel, overdue, incoming-payments, other.

Odpowiedź w formacie JSON:
{
  "title": "nazwa sklepu/firmy (tylko jeśli widzisz)",
  "amount": "kwota (tylko jeśli widzisz)",
  "category": "kategoria",
  "description": "opis produktów/usług (tylko jeśli widzisz)",
  "created_at": "timestamp w milisekundach",
  "percent_title": 85,
  "percent_amount": 95,
  "percent_category": 70,
  "percent_description": 60,
  "percent_created_at": 90
}

Parametry percent_* to wartości 0-100 oznaczające pewność odczytu. Jeśli nie widzisz danej informacji w dokumencie, ustaw percent na 0 i wartość na null.`;
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
                url: `data:${uploadedFile.mimetype};base64,${base64File}`
              }
          }
        ]
      }
    ];

    console.log('Sending request to OpenAI...');
    console.log('User ID:', user_id);
    console.log('File:', uploadedFile.originalname, `(${uploadedFile.mimetype}, ${(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)`);

    // Send request to OpenAI with timeout
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 1000,
        response_format: { type: "json_object" }, // Force JSON response
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), 60000) // 60 second timeout
      )
    ]);

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
      
      // Validate and clean the parsed response
      const cleanResponse = {
        title: parsedResponse.title || null,
        amount: parsedResponse.amount ? parseFloat(parsedResponse.amount.toString().replace(/[^\d.,]/g, '').replace(',', '.')) : null,
        category: parsedResponse.category || null,
        description: parsedResponse.description || '',
        created_at: parsedResponse.created_at || null,
        percent_title: parsedResponse.percent_title || 0,
        percent_amount: parsedResponse.percent_amount || 0,
        percent_category: parsedResponse.percent_category || 0,
        percent_description: parsedResponse.percent_description || 0,
        percent_created_at: parsedResponse.percent_created_at || 0
      };
      
      console.log('Cleaned response:', cleanResponse);
      
      // Check if response contains required fields for transaction and amount confidence is high enough
      if (cleanResponse.title && cleanResponse.amount && cleanResponse.category && 
          cleanResponse.percent_amount >= 80) { // Only create transaction if amount confidence is 80% or higher
        console.log('Valid transaction data found, creating transaction...');
        
        // Prepare transaction data
        const transactionAmount = Math.abs(cleanResponse.amount);
        const transactionTitle = cleanResponse.title;
        const transactionCategory = cleanResponse.category;
        const transactionDescription = cleanResponse.description;
        
        // Handle date - use provided date or current date
        let transactionDate;
        if (cleanResponse.created_at && cleanResponse.percent_created_at != 100) {
          // If we have a confident date, use it
          transactionDate = new Date(parseInt(cleanResponse.created_at)).valueOf();
        } else {
          // Use current date if no confident date available
          transactionDate = new Date().valueOf();
        }
        
        console.log('Transaction date:', transactionDate);
        
        // Create transaction using the createTransaction function directly
        const transactionPayload = {
          user_id: user_id,
          title: transactionTitle,
          amount: transactionAmount,
          category: transactionCategory,
          created_at: transactionDate,
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
        console.log('Missing required fields or low confidence for transaction:', {
          hasTitle: !!cleanResponse.title,
          hasAmount: !!cleanResponse.amount,
          hasCategory: !!cleanResponse.category,
          amountConfidence: cleanResponse.percent_amount || 0
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
