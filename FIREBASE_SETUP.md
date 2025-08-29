# Firebase Setup Guide - System Powiadomień

## 1. Konfiguracja Firebase Project

### Krok 1: Utwórz projekt Firebase
1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. Kliknij "Create a project" lub "Dodaj projekt"
3. Nadaj nazwę projektowi (np. "finance-bay-notifications")
4. Włącz Google Analytics (opcjonalnie)
5. Kliknij "Create project"

### Krok 2: Dodaj aplikację Android/iOS
1. W konsoli Firebase kliknij ikonę Android lub iOS
2. Wprowadź Bundle ID/Package Name swojej aplikacji
3. Pobierz plik `google-services.json` (Android) lub `GoogleService-Info.plist` (iOS)

### Krok 3: Pobierz Service Account Key
1. W konsoli Firebase przejdź do "Project settings" (⚙️)
2. Przejdź do zakładki "Service accounts"
3. Kliknij "Generate new private key"
4. Pobierz plik JSON z kluczem

## 2. Konfiguracja Environment Variables

Dodaj następujące zmienne do pliku `.env`:

```env
# Firebase Configuration
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

## 3. Instalacja Dependencies

```bash
npm install firebase-admin
```

## 4. Struktura Powiadomień

### Format powiadomienia:
```json
{
  "title": "Nowa transakcja: [Tytuł]",
  "body": "[Typ]: [Kwota] PLN - [Kategoria]",
  "data": {
    "transaction_id": "uuid",
    "transaction_type": "expense|income",
    "amount": "100.00",
    "category": "Jedzenie",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 5. Endpoints API

### Dodaj token FCM:
```
POST /api/users/fcm-token/:userId
Body: { "fcm_token": "your-fcm-token" }
```

### Usuń token FCM:
```
DELETE /api/users/fcm-token/:userId
Body: { "fcm_token": "your-fcm-token" }
```

### Automatyczne dodawanie tokenu podczas logowania:
```
GET /api/users/userOverview/:userId?fcm_token=your-fcm-token
```

## 6. Jak to działa

1. **Użytkownik loguje się** → token FCM jest automatycznie dodawany do bazy
2. **Tworzenie transakcji** → endpoint `/transaction` automatycznie wysyła powiadomienie
3. **Powiadomienie zawiera**:
   - Tytuł transakcji
   - Typ (wydatek/przychód)
   - Kwotę
   - Kategorię
   - Timestamp

## 7. Testowanie

### Test powiadomienia:
```bash
curl -X POST http://localhost:5001/api/users/fcm-token/user123 \
  -H "Content-Type: application/json" \
  -d '{"fcm_token": "test-token-123"}'
```

### Test transakcji z powiadomieniem:
```bash
curl -X POST http://localhost:5001/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "title": "Test transakcja",
    "amount": 50.00,
    "category": "Test",
    "transaction_type": "expense",
    "internal_operation": false
  }'
```

## 8. Troubleshooting

### Błąd "Firebase not initialized":
- Sprawdź czy wszystkie zmienne środowiskowe są ustawione
- Sprawdź czy plik service account jest poprawny

### Błąd "No FCM tokens found":
- Użytkownik nie ma jeszcze dodanych tokenów FCM
- Użyj endpoint `/fcm-token` aby dodać token

### Powiadomienia nie docierają:
- Sprawdź czy token FCM jest aktualny
- Sprawdź logi Firebase w konsoli
- Sprawdź czy aplikacja ma uprawnienia do powiadomień

## 9. Bezpieczeństwo

- Service Account Key powinien być chroniony
- Używaj HTTPS w produkcji
- Implementuj rate limiting dla endpointów FCM
- Waliduj tokeny FCM przed zapisem do bazy
