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

        console.log("Database initialized successfully.")
    }
    catch(e){
        console.log("Error initializing database: ", e)
        process.exit(1); // status code 1 means error, 0 success
    }
};