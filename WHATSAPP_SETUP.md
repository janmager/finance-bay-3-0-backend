# WhatsApp Bot Setup

## Konfiguracja bota WhatsApp dla Finance Bay 3.0

### 1. Instalacja zależności

Zależności zostały już zainstalowane:
```bash
npm install twilio express body-parser
```

### 2. Konfiguracja środowiska

Dodaj następujące zmienne do pliku `.env`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+1234567890

# API Configuration
API_BASE_URL=http://localhost:5001
API_TOKEN=your_api_token_here
```

### 3. Rejestracja w Twilio

1. Zarejestruj się na [twilio.com](https://twilio.com)
2. Przejdź do konsoli Twilio
3. Skopiuj Account SID i Auth Token
4. Przejdź do sekcji WhatsApp
5. Aktywuj WhatsApp Sandbox
6. Skopiuj numer WhatsApp

### 4. Konfiguracja webhook

W panelu Twilio ustaw webhook URL na:
```
https://your-domain.com/api/whatsapp/webhook
```

Dla lokalnego testowania możesz użyć ngrok:
```bash
ngrok http 5001
```

### 5. Testowanie

1. Uruchom serwer: `npm start`
2. Wyślij wiadomość na numer WhatsApp Twilio
3. Bot powinien odpowiedzieć używając Twojego API

### 6. Endpointy

- **POST** `/api/whatsapp/webhook` - Webhook od Twilio

### 7. Struktura wiadomości

Bot automatycznie:
1. Odbiera wiadomości WhatsApp
2. Przekazuje je do Twojego API AI (`/api/ai/chat`)
3. Wysyła odpowiedź z powrotem na WhatsApp

### 8. Rozwiązywanie problemów

- Sprawdź logi serwera
- Upewnij się, że wszystkie zmienne środowiskowe są ustawione
- Sprawdź czy Twilio ma dostęp do Twojego webhook URL
- Upewnij się, że Twilio WhatsApp Sandbox jest aktywny
