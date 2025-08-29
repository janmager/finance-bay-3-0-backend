# 🔔 Funkcja Cron - Powiadomienia o Nadchodzących Płatnościach

## 🎯 Przegląd

Funkcja cron `checkUpcomingPaymentsNotifications` sprawdza codziennie o 3:00 GMT+2 (01:00 GMT+0) wszystkie nadchodzące płatności użytkowników i wysyła powiadomienia push, jeśli płatność jest bliżej niż 3 dni.

## ⏰ Harmonogram

- **Czas wykonania:** Codziennie o 03:00 GMT+2 (01:00 GMT+0)
- **Częstotliwość:** Raz dziennie
- **Strefa czasowa:** GMT+2 (Polska)

## 🔍 Co sprawdza funkcja

### 1. Incoming Payments (Nadchodzące płatności)
- Sprawdza tabelę `incoming_payments`
- Filtruje płatności z `deadline` w ciągu najbliższych 3 dni
- Uwzględnia tylko płatności z ustawionym `deadline`

### 2. Recurring Payments (Płatności cykliczne)
- Sprawdza tabelę `recurrings`
- Filtruje płatności cykliczne, które nie zostały opłacone w bieżącym miesiącu
- Sprawdza czy `day_of_month` jest w ciągu najbliższych 3 dni

## 📱 Powiadomienia

### Kiedy wysyła powiadomienia:
- Użytkownik ma FCM tokeny w bazie danych
- Znaleziono nadchodzące płatności (≤ 3 dni)
- Firebase jest poprawnie skonfigurowany

### Format powiadomienia:
- **Tytuł:** "Płatność dziś/jutro/za X dni" lub "Nadchodzące płatności"
- **Treść:** Nazwa płatności + kwota lub liczba płatności
- **Dane:** Szczegółowe informacje o płatnościach

### Przykłady powiadomień:
```
Tytuł: "Płatność jutro"
Treść: "Rachunek za prąd: 150 PLN"

Tytuł: "Nadchodzące płatności"
Treść: "Masz 3 nadchodzące płatności"
```

## 🧪 Testowanie

### 1. Test ręczny (endpoint)
```bash
curl -X POST http://localhost:5001/api/users/test-upcoming-payments/YOUR_USER_ID
```

### 2. Test z aplikacji mobilnej
- Użyj komponentu `NotificationTester`
- Kliknij "Test Nadchodzące Płatności"

### 3. Test funkcji cron
```bash
# Uruchom funkcję ręcznie
curl -X POST http://localhost:5001/api/crons/check-upcoming-payments
```

## 📊 Logi

Funkcja loguje:
- ✅ Liczbę użytkowników z FCM tokenami
- 📅 Liczbę nadchodzących płatności dla każdego użytkownika
- ✅ Sukces wysłania powiadomienia
- ❌ Błędy podczas przetwarzania

### Przykładowe logi:
```
🔔 Starting check for upcoming payments notifications...
📱 Found 5 users with FCM tokens
📅 User user123 has 2 upcoming payments
✅ Notification sent to user user123 for 2 upcoming payments
✅ Finished checking upcoming payments notifications
```

## 🔧 Konfiguracja

### Plik: `src/config/cron.js`
```javascript
export const checkUpcomingPaymentsNotifications = new cron.CronJob("0 0 1 * * *", function async () {
  // Wykonuje się o 01:00 GMT+0 (03:00 GMT+2)
  checkUpcomingPaymentsAndNotify();
});
```

### Plik: `src/controllers/upcomingPaymentsNotificationsController.js`
- Główna logika sprawdzania płatności
- Funkcja wysyłania powiadomień
- Funkcja testowa

## 🚨 Rozwiązywanie problemów

### Problem: Powiadomienia nie są wysyłane
**Sprawdź:**
1. Czy użytkownik ma FCM tokeny w bazie danych
2. Czy są nadchodzące płatności (≤ 3 dni)
3. Czy Firebase jest poprawnie skonfigurowany
4. Logi serwera

### Problem: Funkcja cron nie działa
**Sprawdź:**
1. Czy `NODE_ENV=production` lub `test=true`
2. Czy funkcja jest uruchomiona w `server.js`
3. Logi serwera o 03:00 GMT+2

### Problem: Nieprawidłowe daty
**Sprawdź:**
1. Format daty w bazie danych
2. Strefę czasową serwera
3. Konwersję GMT+0 ↔ GMT+2

## 📋 Struktura danych

### Incoming Payments
```sql
SELECT * FROM incoming_payments 
WHERE user_id = ? 
AND deadline IS NOT NULL
AND deadline > NOW()
AND deadline <= (NOW() + INTERVAL '3 days')
```

### Recurring Payments
```sql
SELECT * FROM recurrings 
WHERE user_id = ?
AND (last_month_paid IS NULL OR last_month_paid != ?)
AND day_of_month::integer >= ?
AND day_of_month::integer <= ?
```

## 🎉 Sukces!

Po poprawnym skonfigurowaniu:
- ✅ Funkcja cron działa codziennie o 03:00
- ✅ Sprawdza nadchodzące płatności
- ✅ Wysyła powiadomienia push
- ✅ Użytkownicy otrzymują przypomnienia
- ✅ Logi są szczegółowe i czytelne
