import express from "express";
import twilio from "twilio";
import bodyParser from "body-parser";

const router = express.Router();

// Konfiguracja Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Middleware do parsowania danych z Twilio
router.use(bodyParser.urlencoded({ extended: false }));

// Endpoint webhook od Twilio
router.post('/webhook', async (req, res) => {
    try {
        const incomingMessage = req.body.Body;
        const fromNumber = req.body.From;
        
        console.log(`Otrzymano wiadomość od ${fromNumber}: ${incomingMessage}`);
        
        // Tutaj możesz dodać logikę do przetwarzania wiadomości
        // i wywołania odpowiednich endpointów Twojego API
        
        // Przykład: wywołanie endpointu AI
        const aiResponse = await callYourAIEndpoint(incomingMessage);
        
        // Wysłanie odpowiedzi z powrotem na WhatsApp
        await sendWhatsAppMessage(fromNumber, aiResponse);
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Błąd w webhook:', error);
        res.status(500).send('Błąd serwera');
    }
});

// Funkcja do wysyłania wiadomości WhatsApp
async function sendWhatsAppMessage(to, message) {
    try {
        await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${to}`
        });
        console.log(`Wysłano wiadomość do ${to}: ${message}`);
    } catch (error) {
        console.error('Błąd wysyłania wiadomości:', error);
    }
}

// Funkcja do wywołania Twojego API
async function callYourAIEndpoint(message) {
    try {
        const response = await fetch(`${process.env.API_BASE_URL}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_TOKEN}`
            },
            body: JSON.stringify({
                message: message,
                source: 'whatsapp'
            })
        });
        
        const data = await response.json();
        return data.response || 'Przepraszam, nie mogę teraz odpowiedzieć.';
    } catch (error) {
        console.error('Błąd wywołania API:', error);
        return 'Przepraszam, wystąpił błąd techniczny.';
    }
}

export default router;
