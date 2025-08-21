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
        
        // Popraw format numeru telefonu - usuń spacje i dodaj + jeśli brakuje
        fromNumber = fromNumber.trim().replace(/\s+/g, '').replace('whatsapp:+', '');
        if (!fromNumber.startsWith('+')) {
           fromNumber = '+' + fromNumber.substring(0,2) + fromNumber.substring(2);
        }
        
        console.log(`🔔 Otrzymano wiadomość WhatsApp od ${fromNumber}: "${incomingMessage}"`);
        
        // Sprawdź czy użytkownik ma sesję
        let userSession = userSessions.get(fromNumber);
        
        if (!userSession) {
            // Nowy użytkownik - poproś o ID
            userSession = {
                phoneNumber: fromNumber,
                userId: null,
                isAuthenticated: false,
                step: 'waiting_for_id',
                lastActivity: new Date().toISOString()
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
            
            // Aktualizuj timestamp aktywności
            userSession.lastActivity = new Date().toISOString();
            
            try {
                const userExists = await checkUserExists(userId);
                
                if (userExists) {
                    // Użytkownik istnieje - zaloguj go
                    userSession.userId = userId;
                    userSession.isAuthenticated = true;
                    userSession.step = 'authenticated';
                    userSession.lastActivity = new Date().toISOString();
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
                console.error('❌ Błąd podczas sprawdzania użytkownika:', error);
                const response = "❌ Wystąpił błąd podczas sprawdzania użytkownika. Spróbuj ponownie.";
                await sendWhatsAppMessage(fromNumber, response);
            }
            
        } else if (userSession.step === 'authenticated') {
            // Użytkownik jest zalogowany - przetwórz wiadomość
            console.log(`💬 Przetwarzanie wiadomości od zalogowanego użytkownika ${userSession.userId}`);
            
            // Aktualizuj timestamp aktywności
            userSession.lastActivity = new Date().toISOString();
            
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
        // Popraw format numeru telefonu - usuń spacje i dodaj + jeśli brakuje
        const cleanNumber = to.trim().replace(/\s+/g, '').replace('whatsapp:+', '');
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber.substring(0,2) + cleanNumber.substring(2) : '+' + cleanNumber.substring(0,2) + cleanNumber.substring(2);
        
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.error('❌ Brak konfiguracji Twilio - nie można wysłać wiadomości');
            return;
        }
        
        const result = await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${formattedNumber}`
        });
        
        console.log(`📤 Wysłano wiadomość WhatsApp do ${formattedNumber}: "${message}"`);
        console.log(`📋 ID wiadomości Twilio: ${result.sid}`);
        
    } catch (error) {
        console.error('❌ Błąd wysyłania wiadomości WhatsApp:', error);
        
        // Dodaj szczegóły o błędzie dla produkcji
        if (error.code === 21211) {
            console.error('💡 Błąd 21211: Nieprawidłowy numer telefonu');
            console.error('💡 Sprawdź format numeru:', to);
        } else if (error.code === 21214) {
            console.error('💡 Błąd 21214: Numer nie jest w WhatsApp');
            console.error('💡 Użytkownik musi mieć aktywny WhatsApp');
        } else if (error.code === 21608) {
            console.error('💡 Błąd 21608: Przekroczono limit wiadomości');
            console.error('💡 Sprawdź limity Twilio WhatsApp Business');
        }
    }
}

// Endpoint do sprawdzania statusu sesji (produkcja)
router.get('/session/:phoneNumber', (req, res) => {
    const { phoneNumber } = req.params;
    const cleanNumber = phoneNumber.trim().replace(/\s+/g, '').replace('whatsapp:+', '');
    const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber.substring(0,2) + cleanNumber.substring(2) : '+' + cleanNumber.substring(0,2) + cleanNumber.substring(2);
    
    const session = userSessions.get(formattedNumber);
    
    if (session) {
        res.json({
            phoneNumber: formattedNumber,
            session: {
                userId: session.userId,
                isAuthenticated: session.isAuthenticated,
                step: session.step,
                lastActivity: new Date().toISOString()
            }
        });
    } else {
        res.json({ phoneNumber: formattedNumber, session: null });
    }
});

// Endpoint do listy wszystkich sesji (produkcja)
router.get('/sessions', (req, res) => {
    const sessions = {};
    const now = new Date();
    
    userSessions.forEach((session, phoneNumber) => {
        sessions[phoneNumber] = {
            userId: session.userId,
            isAuthenticated: session.isAuthenticated,
            step: session.step,
            lastActivity: now.toISOString()
        };
    });
    
    res.json({
        totalSessions: userSessions.size,
        sessions: sessions,
        timestamp: now.toISOString()
    });
});

// Endpoint do czyszczenia starych sesji (produkcja)
router.delete('/sessions/cleanup', (req, res) => {
    const before = userSessions.size;
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 godziny
    
    // Usuń sesje starsze niż 24 godziny
    for (const [phoneNumber, session] of userSessions.entries()) {
        if (session.lastActivity && (now - new Date(session.lastActivity).getTime()) > maxAge) {
            userSessions.delete(phoneNumber);
        }
    }
    
    const after = userSessions.size;
    res.json({
        message: 'Cleanup completed',
        sessionsRemoved: before - after,
        sessionsRemaining: after
    });
});

export default router;
