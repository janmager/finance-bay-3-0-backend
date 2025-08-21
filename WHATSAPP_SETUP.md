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

### 5. Funkcjonalność bota

#### System autoryzacji:
1. **Pierwsza wiadomość**: Bot prosi o ID użytkownika
2. **Weryfikacja ID**: Sprawdza czy użytkownik istnieje w bazie
3. **Logowanie**: Po udanej weryfikacji użytkownik jest "zalogowany"
4. **Instrukcja**: Prosi o wysłanie zdjęcia rachunku/paragonu

#### Przepływ wiadomości:
```
Użytkownik → Bot: "Cześć"
Bot → Użytkownik: "👋 Witaj! Podaj twoje ID użytkownika, aby się zalogować."

Użytkownik → Bot: "12345"
Bot → Użytkownik: "✅ Zalogowano pomyślnie! Teraz wyślij zdjęcie rachunku lub paragonu."

Użytkownik → Bot: [zdjęcie/wiadomość]
Bot → Użytkownik: "📸 Otrzymałem Twoją wiadomość. Przetwarzam..."
```

### 6. Endpointy

- **POST** `/api/whatsapp/webhook` - Webhook od Twilio
- **GET** `/api/whatsapp/session/:phoneNumber` - Status sesji użytkownika
- **GET** `/api/whatsapp/sessions` - Lista wszystkich sesji

### 7. Sesje użytkowników

Bot automatycznie zarządza sesjami użytkowników:
- **waiting_for_id**: Oczekuje na podanie ID
- **authenticated**: Użytkownik zalogowany

### 8. Testowanie

#### Testowy użytkownik:
W bazie danych został utworzony testowy użytkownik:
- **ID**: `test123`
- **Email**: `test@example.com`
- **Username**: `Test User`

#### Kroki testowania:
1. Uruchom serwer: `npm start`
2. Wyślij wiadomość na numer WhatsApp Twilio
3. Bot poprosi o ID użytkownika
4. Podaj ID: `test123`
5. Bot potwierdzi logowanie i poprosi o zdjęcie
6. Wyślij dowolną wiadomość - bot potwierdzi odbiór

#### Testowanie przez API:
```bash
# Pierwsza wiadomość (nowy użytkownik)
curl -X POST http://localhost:5001/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=test&From=+1234567890"

# Podanie ID użytkownika
curl -X POST http://localhost:5001/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=test123&From=+1234567890"

# Sprawdzenie sesji
curl -X GET http://localhost:5001/api/whatsapp/sessions

# Wiadomość od zalogowanego użytkownika
curl -X POST http://localhost:5001/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=zdjecie_rachunku&From=+1234567890"
```

### 9. Rozwiązywanie problemów

- Sprawdź logi serwera (teraz z emoji dla lepszej czytelności)
- Upewnij się, że wszystkie zmienne środowiskowe są ustawione
- Sprawdź czy Twilio ma dostęp do Twojego webhook URL
- Upewnij się, że Twilio WhatsApp Sandbox jest aktywny
- Sprawdź endpoint `/api/whatsapp/sessions` aby zobaczyć aktywne sesje
- Upewnij się, że tabela `users` istnieje w bazie danych

### 10. Logi

Bot teraz loguje wszystkie akcje z emoji:
- 🔔 Otrzymane wiadomości
- 📱 Wysłane wiadomości
- 🔍 Sprawdzanie użytkowników
- 🔐 Logowanie użytkowników
- ❌ Błędy
- 📤 Wysłane wiadomości WhatsApp
- 📋 ID wiadomości Twilio

### 11. Struktura bazy danych

Bot automatycznie tworzy tabelę `users` z następującą strukturą:
```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    monthly_limit DECIMAL(10,2) DEFAULT 3000,
    avatar TEXT,
    currency VARCHAR(10) DEFAULT 'pln',
    balance DECIMAL(10,2) DEFAULT 0
);
```
