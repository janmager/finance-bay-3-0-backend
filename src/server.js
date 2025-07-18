import express from "express";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";
import transactionsRoute from "./routes/transactionsRoute.js"
import usersRoute from "./routes/usersRoute.js"
import cors from 'cors';
import job from './config/cron.js'

dotenv.config();

const app = express();

// middleware
app.use(cors())
app.use(rateLimiter)
app.use(express.json());

if(process.env.NODE_ENV === 'production') job.start();

const PORT = process.env.PORT || 5001;

app.use("/api/transactions", transactionsRoute)
app.use("/api/users", usersRoute)

app.get("/api/health", (req, res) => {
    res.send('API is working fine.')
})

initDB().then(() => {
    app.listen(PORT, () => {
        console.log("Server is up and running on PORT: ", PORT);
    })
})