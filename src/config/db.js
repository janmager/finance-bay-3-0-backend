import { neon } from "@neondatabase/serverless";
import 'dotenv/config';

// create a sql connection
export const sql = neon(process.env.DATABASE_URL);

// export const API_URL = "http://localhost:5001";
export const API_URL = 'https://finance-bay-3-0-backend.onrender.com';

export async function initDB(){
    try{
        await sql`CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(255) NOT NULL,
            created_at VARCHAR(255) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`;

        await sql`CREATE TABLE IF NOT EXISTS incoming_payments (
            id VARCHAR(1000) PRIMARY KEY,
            title TEXT,
            description TEXT,
            deadline TEXT,
            amount DECIMAL,
            user_id TEXT,
            auto_settle BOOLEAN DEFAULT false
        )`;

        await sql`CREATE TABLE IF NOT EXISTS incoming_incomes (
            id TEXT PRIMARY KEY,
            title TEXT,
            user_id TEXT,
            description TEXT,
            deadline TEXT,
            amount NUMERIC,
            created_at TEXT,
            auto_settle BOOLEAN DEFAULT false
        )`;

        await sql`CREATE TABLE IF NOT EXISTS ai_logs (
            id TEXT PRIMARY KEY,
            response TEXT,
            user_id TEXT,
            url TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`;

        await sql`CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(255),
            monthly_limit DECIMAL(10,2) DEFAULT 3000,
            avatar TEXT,
            currency VARCHAR(10) DEFAULT 'pln',
            balance DECIMAL(10,2) DEFAULT 0,
            fcm_tokens JSONB DEFAULT '[]'::jsonb
        )`;

        await sql`CREATE TABLE IF NOT EXISTS currencies (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            name TEXT NOT NULL,
            rate_pln DECIMAL(10,4) NOT NULL,
            last_update_rate TEXT NOT NULL
        )`;

        await sql`CREATE TABLE IF NOT EXISTS foreign_currencies (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id TEXT NOT NULL,
            currency TEXT NOT NULL,
            amount TEXT NOT NULL
        )`;

        console.log("Database initialized successfully.")
    }
    catch(e){
        console.log("Error initializing database: ", e)
        process.exit(1); // status code 1 means error, 0 success
    }
};