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

// Sesje użytkowników WhatsApp (w pamięci - w produkcji użyj Redis)
const userSessions = new Map();

// Endpoint webhook od Twilio
router.post('/webhook', async (req, res) => {
    try {
        const incomingMessage = req.body.Body;
        let fromNumber = req.body.From;
        fromNumber = fromNumber[0] + ' ' + fromNumber.slice(1,)

        console.log(`🔔 Otrzymano wiadomość WhatsApp od ${fromNumber}: "${incomingMessage}"`);
        
        // Sprawdź czy użytkownik ma sesję
        let userSession = userSessions.get(fromNumber);
        
        if (!userSession) {
            // Nowy użytkownik - poproś o ID
            userSession = {
                phoneNumber: fromNumber,
                userId: null,
                isAuthenticated: false,
                step: 'waiting_for_id'
            };
            userSessions.set(fromNumber, userSession);
            
            const response = "👋 Witaj! Podaj twoje ID użytkownika, aby się zalogować.";
            await sendWhatsAppMessage(fromNumber, response);
            console.log(`📱 Wysłano wiadomość powitalną do ${fromNumber}`);
            
            res.status(200).send('OK');
            return;
        }
        
        // Użytkownik ma sesję - sprawdź krok
        if (userSession.step === 'waiting_for_id') {
            // Sprawdź czy podane ID istnieje
            const userId = incomingMessage.trim();
            console.log(`🔍 Sprawdzanie ID użytkownika: ${userId}`);
            
            try {
                const userExists = await checkUserExists(userId);
                
                if (userExists) {
                    // Użytkownik istnieje - zaloguj go
                    userSession.userId = userId;
                    userSession.isAuthenticated = true;
                    userSession.step = 'authenticated';
                    userSessions.set(fromNumber, userSession);
                    
                    const response = "✅ Zalogowano pomyślnie! Teraz wyślij zdjęcie rachunku lub paragonu.";
                    await sendWhatsAppMessage(fromNumber, response);
                    console.log(`🔐 Użytkownik ${userId} zalogowany przez WhatsApp ${fromNumber}`);
                    
                } else {
                    // Użytkownik nie istnieje
                    const response = "❌ Użytkownik o podanym ID nie istnieje. Spróbuj ponownie lub podaj poprawne ID.";
                    await sendWhatsAppMessage(fromNumber, response);
                    console.log(`❌ Próba logowania nieudana - ID ${userId} nie istnieje`);
                }
                
            } catch (error) {
                console.error('Błąd podczas sprawdzania użytkownika:', error);
                const response = "❌ Wystąpił błąd podczas sprawdzania użytkownika. Spróbuj ponownie.";
                await sendWhatsAppMessage(fromNumber, response);
            }
            
        } else if (userSession.step === 'authenticated') {
            // Użytkownik jest zalogowany - przetwórz wiadomość
            console.log(`💬 Przetwarzanie wiadomości od zalogowanego użytkownika ${userSession.userId}`);
            
            // Tutaj możesz dodać logikę do przetwarzania zdjęć/wiadomości
            // Na razie potwierdź odbiór
            const response = "📸 Otrzymałem Twoją wiadomość. Przetwarzam...";
            await sendWhatsAppMessage(fromNumber, response);
            
            // Możesz tutaj dodać wywołanie Twojego API AI
            // const aiResponse = await callYourAIEndpoint(incomingMessage, userSession.userId);
            // await sendWhatsAppMessage(fromNumber, aiResponse);
        }
        
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('❌ Błąd w webhook WhatsApp:', error);
        res.status(500).send('Błąd serwera');
    }
});

// Funkcja sprawdzająca czy użytkownik istnieje
async function checkUserExists(userId) {
    try {
        console.log(`🔍 Sprawdzanie użytkownika o ID: ${userId}`);
        
        const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:5001'}/api/users/userOverview/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            console.log(`✅ Użytkownik ${userId} istnieje:`, userData.user?.username || 'Brak nazwy');
            return true;
        } else if (response.status === 404) {
            console.log(`❌ Użytkownik ${userId} nie istnieje`);
            return false;
        } else {
            console.error(`❌ Błąd API podczas sprawdzania użytkownika ${userId}:`, response.status);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas sprawdzania użytkownika:', error);
        return false;
    }
}

// Funkcja do wysyłania wiadomości WhatsApp
async function sendWhatsAppMessage(to, message) {
    try {
        // Tryb testowy - nie wysyłaj rzeczywistych wiadomości WhatsApp
        if (process.env.TEST_MODE === 'true') {
            console.log(`🧪 [TEST MODE] Wiadomość do ${to}: "${message}"`);
            return;
        }
        
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.error('❌ Brak konfiguracji Twilio - nie można wysłać wiadomości');
            return;
        }
        
        const result = await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${to}`
        });
        
        console.log(`📤 Wysłano wiadomość WhatsApp do ${to}: "${message}"`);
        console.log(`📋 ID wiadomości Twilio: ${result.sid}`);
        
    } catch (error) {
        console.error('❌ Błąd wysyłania wiadomości WhatsApp:', error);
        
        // Dodaj więcej szczegółów o błędzie
        if (error.code === 21211) {
            console.error('💡 Wskazówka: Użytkownik musi najpierw dołączyć do WhatsApp Sandbox');
            console.error('💡 Użytkownik powinien wysłać "join <słowo>" na numer Twilio');
        }
    }
}

// Funkcja do wywołania Twojego API AI (opcjonalna)
async function callYourAIEndpoint(message, userId) {
    try {
        const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:5001'}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                source: 'whatsapp',
                userId: userId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.response || 'Przepraszam, nie mogę teraz odpowiedzieć.';
        } else {
            console.error('❌ Błąd API AI:', response.status);
            return 'Przepraszam, wystąpił błąd techniczny.';
        }
        
    } catch (error) {
        console.error('❌ Błąd wywołania API AI:', error);
        return 'Przepraszam, wystąpił błąd techniczny.';
    }
}

// Endpoint do sprawdzania statusu sesji (debug)
router.get('/session/:phoneNumber', (req, res) => {
    const { phoneNumber } = req.params;
    const session = userSessions.get(phoneNumber);
    
    if (session) {
        res.json({
            phoneNumber,
            session: {
                userId: session.userId,
                isAuthenticated: session.isAuthenticated,
                step: session.step
            }
        });
    } else {
        res.json({ phoneNumber, session: null });
    }
});

// Endpoint do listy wszystkich sesji (debug)
router.get('/sessions', (req, res) => {
    const sessions = {};
    userSessions.forEach((session, phoneNumber) => {
        sessions[phoneNumber] = {
            userId: session.userId,
            isAuthenticated: session.isAuthenticated,
            step: session.step
        };
    });
    res.json(sessions);
});

export default router;
