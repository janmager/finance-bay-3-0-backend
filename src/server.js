import express from "express";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";
import transactionsRoute from "./routes/transactionsRoute.js"
import cors from 'cors';

dotenv.config();

const app = express();

// middleware
app.use(cors())
app.use(rateLimiter)
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.use("/api/transactions", transactionsRoute)

app.get("/api/health", (req, res) => {
    res.send('API is working fine.')
})

initDB().then(() => {
    app.listen(PORT, () => {
        console.log("Server is up and running on PORT: ", PORT);
    })
})