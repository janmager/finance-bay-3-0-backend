# FinanceBay 3.0 - API Documentation

<div align="center">

![FinanceBay Logo](https://img.shields.io/badge/FinanceBay-3.0-blue?style=for-the-badge&logo=finance)

**Backend API for Personal Finance Management System**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21+-blue?style=flat&logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Authentication & Security](#authentication--security)
- [Data Models](#data-models)
- [Cron Jobs](#cron-jobs)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Development](#development)

---

## 🚀 Overview

FinanceBay 3.0 is a comprehensive personal finance management API that provides tools for tracking expenses, managing savings, handling recurring transactions, and gaining insights into financial patterns through AI-powered analysis.

### Key Features

- 💰 **Transaction Management** - Track income and expenses with categorization
- 🎯 **Savings Goals** - Set and monitor savings targets
- 🔄 **Recurring Transactions** - Automate regular payments and income
- 📊 **Financial Analytics** - AI-powered insights and reporting
- 📈 **Balance Tracking** - Monitor account balances over time
- 🤖 **AI Integration** - Smart financial analysis and recommendations

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Neon Serverless)
- Redis instance (Upstash)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd finance-bay-3-0/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev

# Start production server
npm start
```

### Environment Variables

```env
NODE_ENV=development
PORT=5001
DATABASE_URL=your_neon_database_url
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
OPENAI_API_KEY=your_openai_api_key
```

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:5001/api
```

### Health Check
```http
GET /api/health
```
**Response:** `"API is working fine."`

---

## 👥 Users Management

### Create User
```http
POST /api/users
```
**Body:**
```json
{
  "username": "string",
  "email": "string",
  "monthlyLimit": "number"
}
```

### Get User Overview
```http
GET /api/users/userOverview/:userId
```

### Update User Balance
```http
POST /api/users/updateBalance/:userId
```
**Body:**
```json
{
  "balance": "number"
}
```

### Update Monthly Limit
```http
POST /api/users/updateMonthlyLimit/:userId
```
**Body:**
```json
{
  "monthlyLimit": "number"
}
```

### Update Username
```http
POST /api/users/updateUsername/:userId
```
**Body:**
```json
{
  "username": "string"
}
```

### Get Total Account Value
```http
GET /api/users/totalAccountValue/:userId
```

---

## 💳 Transactions

### Create Transaction
```http
POST /api/transactions
```
**Body:**
```json
{
  "userId": "string",
  "amount": "number",
  "category": "string",
  "description": "string",
  "type": "income|expense",
  "date": "date"
}
```

### Get User Transactions
```http
GET /api/transactions/:userId
```

### Get Last Days Transactions
```http
GET /api/transactions/last-days/:userId/:daysBack
```

### Get Most Categories Stats (This Month)
```http
GET /api/transactions/most-categories-stats-this-month/:userId
```

### Delete Transaction
```http
DELETE /api/transactions/:id
```

### Get Calendar Data
```http
GET /api/transactions/calendar/:userId
```

### Get Summary
```http
GET /api/transactions/summary/:userId
```

### Update Transaction
```http
POST /api/transactions/update-transaction/:userId/:id
```

### Return Transaction
```http
POST /api/transactions/return-transaction/:userId
```

### Get Daily Grouped Transactions
```http
GET /api/transactions/day-grouped/:userId
```

---

## 🎯 Savings

### Get User Savings
```http
GET /api/savings/:userId
```

### Create Saving
```http
POST /api/savings/:userId
```
**Body:**
```json
{
  "name": "string",
  "targetAmount": "number",
  "currentAmount": "number",
  "targetDate": "date"
}
```

### Delete Saving
```http
DELETE /api/savings/:id
```

### Deposit to Saving
```http
POST /api/savings/deposit/:userId
```
**Body:**
```json
{
  "savingId": "string",
  "amount": "number"
}
```

### Withdraw from Saving
```http
POST /api/savings/withdraw/:userId
```
**Body:**
```json
{
  "savingId": "string",
  "amount": "number"
}
```

---

## 🔄 Recurring Transactions

### Get User Recurrings
```http
GET /api/recurrings/:userId
```

### Create Recurring
```http
POST /api/recurrings/:userId
```
**Body:**
```json
{
  "name": "string",
  "amount": "number",
  "category": "string",
  "frequency": "daily|weekly|monthly|yearly",
  "nextDueDate": "date"
}
```

### Delete Recurring
```http
DELETE /api/recurrings/:recurringId
```

---

## 📊 Balance Logs

### Get User Balance Logs
```http
GET /api/balances-logs/get/:userId
```

---

## 📝 Account Logs

### Get User Account Logs
```http
GET /api/account-logs/get/:userId
```

---

## 💸 Incoming Payments

### Create Incoming Payment
```http
POST /api/incoming-payments
```
**Body:**
```json
{
  "userId": "string",
  "amount": "number",
  "description": "string",
  "expectedDate": "date"
}
```

### Get User Incoming Payments
```http
GET /api/incoming-payments/:userId
```

### Delete Incoming Payment
```http
DELETE /api/incoming-payments/:userId/:id
```

### Settle Incoming Payment
```http
POST /api/incoming-payments/settle/:userId/:id
```

---

## 🤖 AI Integration

### Process AI Request
```http
POST /api/ai
```
**Body:** `multipart/form-data`
- `text`: Text query
- `image`: Image file (optional, max 10MB)

**Features:**
- Financial document analysis
- Receipt processing
- Spending pattern insights
- Budget recommendations

---

## ⏰ Cron Jobs

### Check All Users Recurrings
```http
GET /api/crons/check-all-recurrings-for-users
```

**Automated Tasks:**
- Daily balance tracking
- Recurring transaction processing
- Account value calculations
- Payment reminders

---

## 🔐 Authentication & Security

### Rate Limiting
- **Global Rate Limit:** 100 requests per minute per IP
- **AI Endpoint:** 10 requests per minute per IP
- **File Upload:** 10MB maximum file size

### CORS
- Cross-origin requests enabled
- Configurable for production environments

---

## 📊 Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  monthlyLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
  date: Date;
  createdAt: Date;
}
```

### Saving
```typescript
interface Saving {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  createdAt: Date;
}
```

### Recurring
```typescript
interface Recurring {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate: Date;
  createdAt: Date;
}
```

---

## 🚨 Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🚀 Development

### Scripts
```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
```

### Project Structure
```
src/
├── config/          # Database, cron, and external service configs
├── controllers/     # Business logic and request handlers
├── middleware/      # Express middleware (rate limiting, etc.)
├── routes/          # API route definitions
└── server.js        # Main application entry point
```

### Dependencies
- **Express.js** - Web framework
- **Neon Database** - Serverless PostgreSQL
- **Upstash Redis** - Rate limiting and caching
- **OpenAI** - AI-powered financial analysis
- **Cron** - Scheduled task management
- **Multer** - File upload handling

---

## 📈 Performance & Monitoring

### Database
- **Neon Serverless** - Auto-scaling PostgreSQL
- **Connection pooling** for optimal performance
- **Query optimization** for financial data

### Caching
- **Redis-based rate limiting**
- **Session management**
- **Frequently accessed data caching**

### Monitoring
- **Health check endpoint**
- **Request logging**
- **Error tracking**
- **Performance metrics**

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

**FinanceBay 3.0** - Empowering your financial future with intelligent insights and seamless management.

*Built with ❤️ using modern web technologies*

</div>
