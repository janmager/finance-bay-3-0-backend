# Foreign Currencies Management System

## Overview
This system allows users to manage their foreign currency holdings (EUR, USD, GBP, JPY) with automatic PLN value calculations based on current exchange rates.

## Features
- **Multi-Currency Support**: EUR, USD, GBP, JPY
- **Automatic PLN Conversion**: Real-time value calculation using current exchange rates
- **Deposit/Withdrawal System**: Easy currency management with balance validation
- **Zero Balance Protection**: Prevents negative balances
- **User-Specific Records**: Each user has their own currency portfolio

## Database Schema
```sql
CREATE TABLE foreign_currencies (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount TEXT NOT NULL
);
```

## API Endpoints

### Base URL: `/api/foreign-currencies`

### 1. Get User's Foreign Currencies
```
GET /api/foreign-currencies/:userId
```
Returns all foreign currencies owned by a specific user.

**Response:**
```json
[
  {
    "id": 1,
    "user_id": "user123",
    "currency": "EUR",
    "amount": "150.00"
  },
  {
    "id": 2,
    "user_id": "user123",
    "currency": "USD",
    "amount": "200.00"
  }
]
```

### 2. Get Total Value in PLN
```
GET /api/foreign-currencies/:userId/total-value
```
Returns the total value of all user's foreign currencies converted to PLN using current exchange rates.

**Response:**
```json
{
  "totalValuePLN": "1250.50",
  "currencies": [
    {
      "id": 1,
      "user_id": "user123",
      "currency": "EUR",
      "amount": "150.00"
    }
  ]
}
```

### 3. Update Currency Amount
```
POST /api/foreign-currencies/:userId/update
```
Updates or creates a currency record for a user. Can be used for deposits (positive) or withdrawals (negative).

**Request Body:**
```json
{
  "currency": "EUR",
  "amountChange": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Currency EUR updated successfully",
  "previousAmount": 100,
  "newAmount": 150,
  "change": 50
}
```

### 4. Deposit Currency
```
POST /api/foreign-currencies/:userId/deposit
```
Convenience endpoint for depositing currency (positive amounts only).

**Request Body:**
```json
{
  "currency": "USD",
  "amount": 100
}
```

### 5. Withdraw Currency
```
POST /api/foreign-currencies/:userId/withdraw
```
Convenience endpoint for withdrawing currency (prevents insufficient funds).

**Request Body:**
```json
{
  "currency": "EUR",
  "amount": 25
}
```

## Business Logic

### Currency Creation
- New currency records are automatically created when a user first deposits
- Initial amounts cannot be negative
- Supported currencies: EUR, USD, GBP, JPY

### Balance Updates
- Positive `amountChange` adds to balance (deposit)
- Negative `amountChange` subtracts from balance (withdrawal)
- Balances cannot go below 0
- Insufficient funds errors are returned for invalid withdrawals

### PLN Value Calculation
- Uses current exchange rates from the `currencies` table
- Automatically converts all foreign currencies to PLN
- Real-time calculations based on latest rates

## Error Handling

### Validation Errors
- **Missing Fields**: Returns 400 if required fields are missing
- **Invalid Currency**: Returns 400 for unsupported currencies
- **Invalid Amount**: Returns 400 for non-numeric amounts

### Business Logic Errors
- **Insufficient Funds**: Returns 400 when withdrawal would exceed available balance
- **Negative Initial Amount**: Returns 400 when trying to create currency with negative amount

### Server Errors
- **Database Errors**: Returns 500 for database operation failures
- **Exchange Rate Errors**: Gracefully handles missing exchange rates

## Example Usage

### Scenario 1: User deposits 100 EUR
```bash
POST /api/foreign-currencies/user123/deposit
{
  "currency": "EUR",
  "amount": 100
}
```

### Scenario 2: User withdraws 25 EUR
```bash
POST /api/foreign-currencies/user123/withdraw
{
  "currency": "EUR",
  "amount": 25
}
```

### Scenario 3: Check user's portfolio
```bash
GET /api/foreign-currencies/user123
```

### Scenario 4: Get total PLN value
```bash
GET /api/foreign-currencies/user123/total-value
```

## Testing
You can test the functionality using the provided test script:
```bash
node test-foreign-currencies.js
```

## Integration with Currency System
This system integrates with the existing currency exchange rate system:
- Automatically uses current rates from `/api/currencies`
- Real-time PLN value calculations
- Seamless integration with the daily rate refresh cron job

## Security Features
- Input validation for all parameters
- SQL injection protection through parameterized queries
- User-specific data isolation
- Comprehensive error handling and logging
