import { sql } from "../config/db.js";

export async function createUser(req, res){
    try{
        const { user_id, email, avatar } = req.body;
    
        if(!user_id || !email){
            return res.status(400).json({message: "All fields are required."})
        }

        const username = email.split('@')[0];

        console.log(username)

        const if_is = await sql`
            SELECT * FROM users WHERE id = ${user_id} OR email = ${email}
        `;
        if(if_is.length > 0){
            return res.status(200).json({data: if_is[0]})
        }

        const users = await sql`
        INSERT INTO users (id, email, username, monthly_limit, avatar) 
        VALUES (${user_id}, ${email}, ${username}, 3000, ${avatar})
            RETURNING *
        `;
        res.status(201).json({data: users[0]})
    }   
    catch(e){
        console.log("Error creating user: ",);
        res.status(500).json({message: "Something went wrong."});
    } 
}