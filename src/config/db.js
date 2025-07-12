import { neon } from "@neondatabase/serverless";
import 'dotenv/config';

// create a sql connection
export const sql = neon(process.env.DATABASE_URL);

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

        console.log("Database initialized successfully.")
    }
    catch(e){
        console.log("Error initializing database: ", e)
        process.exit(1); // status code 1 means error, 0 success
    }
};