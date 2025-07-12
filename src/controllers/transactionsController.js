import { sql } from "../config/db.js";

export async function getTransactionByUserId(req, res){
    try{
        const { userId } = req.params;

        const transactions = await sql`
            SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC
        `;

        res.status(200).json(transactions);
    }
    catch(e){
        console.log("Error getting the transaction: ", e);
        res.status(500).json({message: "Something went wrong."});
    }    
}

export async function createTransaction(req, res){
    try{
        const { user_id, title, amount, category } = req.body;
    
        if(!title || !user_id || amount === undefined || !category){
            return res.status(400).json({message: "All fields are required."})
        }

        const id = crypto.randomUUID();
        const transaction = await sql`
        INSERT INTO transactions (id, user_id, title, amount, category) 
        VALUES (${id}, ${user_id}, ${title}, ${amount}, ${category})
            RETURNING *
        `;
    
        console.log(transaction)
        res.status(201).json(transaction[0])
    }   
    catch(e){
        console.log("Error creating the transaction: ", e);
        res.status(500).json({message: "Something went wrong."});
    } 
}

export async function deleteTransaction(req, res){
    try{
        const { id } = req.params;
        console.log(id)
        const result = await sql`
            DELETE FROM transactions WHERE id = ${id} RETURNING *
        `;

        if(result.length === 0){
            return res.status(404).json({message: "Transaction not found."});
        }

        res.status(200).json({message: "Transaction deleted successfully."});
    }
    catch(e){
        console.log("Error deleting the transaction: ", e);
        res.status(500).json({message: "Something went wrong."});
    }
}

export async function getSummaryByUserId (req, res){
    try{
        const { userId } = req.params;

        const balanceResult = await sql`
            SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE user_id = ${userId}
        `;  

        const incomeResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as income FROM transactions WHERE user_id = ${userId} AND amount > 0
        `;

        const expenseResult = await sql`
            SELECT COALESCE(SUM(amount), 0) as expense FROM transactions WHERE user_id = ${userId} AND amount < 0
        `;

        const totalTransactions = await sql`
            SELECT COUNT(*) as totalTransaction FROM transactions WHERE user_id = ${userId}
        `;

        res.status(200).json({
            balance: Number(balanceResult[0].balance),
            income: Number(incomeResult[0].income),
            expense: Number(expenseResult[0].expense),
            total_transactions: parseInt(totalTransactions[0].totaltransaction)
        })
    }
    catch(e){
        console.log("Error getting the transaction summary: ", e);
        res.status(500).json({message: "Something went wrong."});
    }
}