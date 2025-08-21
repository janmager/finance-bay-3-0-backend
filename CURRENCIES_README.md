# Currency Management System

## Overview
This system automatically manages currency exchange rates for EUR/PLN, USD/PLN, GBP/PLN, and JPY/PLN pairs. It uses a free API to fetch current rates and stores them in a database.

## Features
- **Automatic Updates**: Currency rates are refreshed every 24 hours at midnight (GMT+2)
- **Free API Integration**: Uses exchangerate-api.com (free tier)
- **Database Storage**: Rates are stored in a PostgreSQL database
- **REST API**: Provides endpoints to view and manually refresh rates

## Database Schema
```sql
CREATE TABLE currencies (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  rate_pln DECIMAL(10,4) NOT NULL,
  last_update_rate TEXT NOT NULL
);
```

## API Endpoints

### 1. Initialize Currencies Table
```
POST /api/currencies/init
```
Initializes the currencies table with initial data (run once during setup).

### 2. Refresh Currency Rates
```
POST /api/currencies/refresh
```
Manually refreshes all currency rates from the external API.

### 3. Get All Currency Rates
```
GET /api/currencies
```
Returns all current currency rates.

### 4. Get Specific Currency Rate
```
GET /api/currencies/:currencyName
```
Returns a specific currency rate (e.g., `/api/currencies/EUR/PLN`).

## Cron Job
The system automatically refreshes currency rates every 24 hours at midnight (GMT+2) using a cron job:
- **Schedule**: `0 0 22 * * *` (22:00 GMT+0, which is 00:00 GMT+2)
- **Function**: `refreshCurrenciesDaily`
- **Action**: Calls the `/api/currencies/refresh` endpoint

## Currency Pairs Supported
- EUR/PLN (Euro to Polish Złoty)
- USD/PLN (US Dollar to Polish Złoty)
- GBP/PLN (British Pound to Polish Złoty)
- JPY/PLN (Japanese Yen to Polish Złoty)

## Setup Instructions

1. **Database**: The currencies table will be automatically created when the server starts
2. **Initialization**: The system will automatically populate initial rates on first run
3. **Cron Job**: The automatic refresh job will start when the server starts in production mode

## Testing
You can test the functionality using the provided test script:
```bash
node test-currencies.js
```

## Error Handling
- API failures are logged but don't crash the system
- Database errors are properly handled and logged
- The cron job continues to run even if individual refreshes fail

## Rate Limits
The free API has rate limits, so the system is designed to minimize API calls:
- Only one call per day for automatic updates
- Manual refresh available when needed
- Rates are cached in the database between updates
