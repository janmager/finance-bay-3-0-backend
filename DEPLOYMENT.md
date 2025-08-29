# Deployment Guide - Finance Bay Backend

## Problem rozwiązany ✅
- **Błąd npm**: `Invalid Version` - naprawiony w `package.json`
- **Wersja**: zmieniona z `3.1.11` na `3.1.0` (zgodna z semantic versioning)
- **Cache npm**: wyczyszczony i naprawiony
- **Zależności**: zainstalowane od nowa

## Pliki konfiguracyjne utworzone

### 1. `.npmrc` - Konfiguracja npm
```
cache=.npm-cache
prefer-offline=true
audit=false
fund=false
```

### 2. `render.yaml` - Konfiguracja Render.com
```yaml
services:
  - type: web
    name: finance-bay-backend
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
```

### 3. `Procfile` - Konfiguracja Heroku
```
web: npm start
```

### 4. `ecosystem.config.js` - Konfiguracja PM2
```javascript
module.exports = {
  apps: [{
    name: 'finance-bay-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster'
  }]
};
```

## Instrukcje wdrożenia

### Krok 1: Sprawdź pliki
```bash
# Sprawdź czy package.json ma poprawną wersję
cat package.json | grep version

# Sprawdź czy package-lock.json istnieje
ls -la package-lock.json

# Sprawdź czy node_modules istnieje
ls -la node_modules
```

### Krok 2: Commit i push
```bash
git add .
git commit -m "Fix npm version and add deployment configs"
git push origin main
```

### Krok 3: Wdrożenie na Render.com
1. Połącz repozytorium GitHub z Render.com
2. Render automatycznie wykryje `render.yaml`
3. Ustaw zmienne środowiskowe w dashboardzie Render

### Krok 4: Wdrożenie na Heroku
```bash
# Zainstaluj Heroku CLI
npm install -g heroku

# Zaloguj się
heroku login

# Utwórz aplikację
heroku create your-app-name

# Dodaj zmienne środowiskowe
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your_database_url

# Wdróż
git push heroku main
```

### Krok 5: Wdrożenie z PM2
```bash
# Zainstaluj PM2
npm install -g pm2

# Uruchom aplikację
pm2 start ecosystem.config.js --env production

# Zapisz konfigurację
pm2 save

# Ustaw autostart
pm2 startup
```

## Zmienne środowiskowe wymagane

### Podstawowe
```env
NODE_ENV=production
DATABASE_URL=your_database_connection_string
```

### Firebase (dla powiadomień)
```env
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
```

## Testowanie po wdrożeniu

### 1. Sprawdź health endpoint
```bash
curl https://your-app-name.onrender.com/api/health
# lub
curl https://your-app-name.herokuapp.com/api/health
```

### 2. Test FCM token
```bash
curl -X POST https://your-app-name.onrender.com/api/users/fcm-token/test-user \
  -H "Content-Type: application/json" \
  -d '{"fcm_token": "test-token-123"}'
```

### 3. Test transakcji z powiadomieniem
```bash
curl -X POST https://your-app-name.onrender.com/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "title": "Test transakcja",
    "amount": 50.00,
    "category": "Test",
    "transaction_type": "expense",
    "internal_operation": false
  }'
```

## Troubleshooting

### Błąd: "Invalid Version"
- ✅ **Rozwiązane**: Wersja w `package.json` zmieniona na `3.1.0`

### Błąd: "npm cache issues"
- ✅ **Rozwiązane**: Cache wyczyszczony, uprawnienia naprawione

### Błąd: "Module not found"
```bash
# Usuń node_modules i zainstaluj ponownie
rm -rf node_modules package-lock.json
npm install
```

### Błąd: "Port already in use"
```bash
# Sprawdź jakie procesy używają portu
lsof -i :5001

# Zatrzymaj proces
kill -9 <PID>
```

## Weryfikacja wdrożenia

Po udanym wdrożeniu powinieneś mieć:
- ✅ Aplikacja działa na serwerze
- ✅ Health endpoint odpowiada
- ✅ FCM tokeny są dodawane
- ✅ Powiadomienia są wysyłane
- ✅ Logi pokazują sukces

## Monitoring

### Render.com
- Dashboard z logami i metrykami
- Automatyczne restarty przy błędach

### Heroku
```bash
# Sprawdź logi
heroku logs --tail

# Sprawdź status
heroku ps
```

### PM2
```bash
# Sprawdź status
pm2 status

# Sprawdź logi
pm2 logs

# Monitor w czasie rzeczywistym
pm2 monit
```
