# Konfiguracja Bazy Danych dla FCM Tokens

## Problem
Kolumna `fcm_tokens` w tabeli `users` może być zdefiniowana jako `TEXT[]` (tablica PostgreSQL) lub `TEXT`, ale w rzeczywistości przechowuje stringi tekstowe. To powoduje problemy z pobieraniem i zapisywaniem tokenów FCM.

## Rozwiązanie
Zmieńmy kolumnę na typ `JSONB` - to najlepszy typ dla przechowywania tablic JSON w PostgreSQL.

## Krok 1: Sprawdź aktualną strukturę

Uruchom w swojej bazie danych:

```sql
-- Sprawdź aktualny typ kolumny
SELECT 
  column_name, 
  data_type, 
  udt_name,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'fcm_tokens';
```

## Krok 2: Wykonaj migrację

### Opcja A: Użyj gotowego skryptu migracji
1. Pobierz plik `migrate-fcm-tokens.sql`
2. Uruchom go w swojej bazie danych:
```bash
psql -d your_database_name -f migrate-fcm-tokens.sql
```

### Opcja B: Wykonaj migrację ręcznie

```sql
-- 1. Backup (opcjonalnie ale zalecane)
CREATE TABLE users_backup AS SELECT * FROM users;

-- 2. Zmień typ kolumny na JSONB
ALTER TABLE users 
ALTER COLUMN fcm_tokens TYPE JSONB 
USING 
  CASE 
    WHEN fcm_tokens IS NULL THEN '[]'::jsonb
    WHEN fcm_tokens = '{}' THEN '[]'::jsonb
    WHEN fcm_tokens = '[]' THEN '[]'::jsonb
    WHEN pg_typeof(fcm_tokens) = 'text[]'::regtype THEN 
      CASE 
        WHEN array_length(fcm_tokens, 1) IS NULL THEN '[]'::jsonb
        ELSE to_jsonb(fcm_tokens)
      END
    WHEN pg_typeof(fcm_tokens) = 'text'::regtype THEN
      CASE 
        WHEN fcm_tokens ~ '^\[.*\]$' THEN fcm_tokens::jsonb
        ELSE '[]'::jsonb
      END
    ELSE '[]'::jsonb
  END;

-- 3. Ustaw domyślną wartość
ALTER TABLE users 
ALTER COLUMN fcm_tokens SET DEFAULT '[]'::jsonb;

-- 4. Utwórz indeks dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_users_fcm_tokens ON users USING GIN (fcm_tokens);
```

## Krok 3: Sprawdź czy migracja się udała

```sql
-- Sprawdź typ kolumny
SELECT 
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'fcm_tokens';

-- Sprawdź dane
SELECT 
  id, 
  fcm_tokens, 
  pg_typeof(fcm_tokens) as column_type,
  CASE 
    WHEN fcm_tokens IS NULL THEN 'NULL'
    WHEN fcm_tokens = '[]'::jsonb THEN 'Empty JSON array'
    WHEN jsonb_array_length(fcm_tokens) = 0 THEN 'Empty JSON array'
    ELSE 'Has ' || jsonb_array_length(fcm_tokens) || ' tokens'
  END as data_status
FROM users 
LIMIT 5;
```

## Krok 4: Testuj funkcjonalność

### Test 1: Dodaj token FCM
```bash
curl -X POST http://localhost:5001/api/users/fcm-token/test-user \
  -H "Content-Type: application/json" \
  -d '{"fcm_token": "test-token-123"}'
```

### Test 2: Sprawdź w bazie danych
```sql
SELECT id, fcm_tokens, jsonb_array_length(fcm_tokens) as token_count
FROM users 
WHERE id = 'test-user';
```

### Test 3: Automatyczne dodawanie podczas getUserOverview
```bash
curl "http://localhost:5001/api/users/userOverview/test-user?fcm_token=new-token-456"
```

### Test 4: Sprawdź czy token został dodany
```sql
SELECT id, fcm_tokens, jsonb_array_length(fcm_tokens) as token_count
FROM users 
WHERE id = 'test-user';
```

## Krok 5: Sprawdź logi aplikacji

W logach aplikacji powinieneś zobaczyć:
```
✅ FCM token added for user test-user. Total tokens: 2
ℹ️ FCM token already exists for user test-user
```

## Korzyści z JSONB

1. **Lepsze zapytania**: Możesz używać operatorów JSON jak `@>`, `?|`, `?&`
2. **Wydajność**: Indeksy GIN dla szybkiego wyszukiwania
3. **Walidacja**: PostgreSQL automatycznie waliduje format JSON
4. **Elastyczność**: Łatwo dodawać/usuwać elementy z tablicy

## Przykłady zaawansowanych zapytań

```sql
-- Znajdź użytkowników z konkretnym tokenem
SELECT id, username FROM users 
WHERE fcm_tokens @> '["specific-token"]'::jsonb;

-- Znajdź użytkowników z wieloma tokenami
SELECT id, username, jsonb_array_length(fcm_tokens) as token_count
FROM users 
WHERE jsonb_array_length(fcm_tokens) > 1;

-- Usuń konkretny token ze wszystkich użytkowników
UPDATE users 
SET fcm_tokens = fcm_tokens - 'old-token';

-- Dodaj token do wszystkich użytkowników
UPDATE users 
SET fcm_tokens = fcm_tokens || '["new-token"]'::jsonb;
```

## Troubleshooting

### Błąd: "column fcm_tokens does not exist"
```sql
-- Dodaj kolumnę jeśli nie istnieje
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_tokens JSONB DEFAULT '[]'::jsonb;
```

### Błąd: "cannot cast type text to jsonb"
```sql
-- Sprawdź dane przed migracją
SELECT fcm_tokens, pg_typeof(fcm_tokens) 
FROM users 
WHERE fcm_tokens IS NOT NULL 
LIMIT 5;
```

### Błąd: "syntax error at or near '::'"
- Upewnij się, że używasz PostgreSQL 9.4+ (JSONB został wprowadzony w tej wersji)

## Weryfikacja końcowa

Po migracji powinieneś mieć:
- ✅ Kolumna `fcm_tokens` typu `JSONB`
- ✅ Domyślna wartość `[]` (pusta tablica JSON)
- ✅ Indeks GIN dla wydajności
- ✅ Wszystkie funkcje FCM działają poprawnie
- ✅ Logi pokazują sukces dodawania tokenów
