import express from "express";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";
import transactionsRoute from "./routes/transactionsRoute.js";
import usersRoute from "./routes/usersRoute.js";
import cronsRoute from "./routes/cronsRoute.js";
import savingsRoute from "./routes/savingsRoute.js";
import recurringsRoute from "./routes/recurringsRoute.js";
import balancesLogsRoute from "./routes/balancesLogsRoute.js";
import accountLogsRoute from "./routes/accountLogsRoute.js";
import incomingPaymentsRoute from "./routes/incomingPaymentsRoute.js";
import cors from "cors";
import { checkUsersRecurrings, saveUsersWalletsBalances, wakeupJob, saveUsersAccountsValueAll } from "./config/cron.js";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(rateLimiter);
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  wakeupJob.start();
  checkUsersRecurrings.start();
  saveUsersWalletsBalances.start();
  saveUsersAccountsValueAll.start();
}

const PORT = process.env.PORT || 5001;

app.use("/api/transactions", transactionsRoute);
app.use("/api/crons", cronsRoute);
app.use("/api/users", usersRoute);
app.use("/api/savings", savingsRoute);
app.use("/api/recurrings", recurringsRoute);
app.use("/api/balances-logs", balancesLogsRoute);
app.use("/api/account-logs", accountLogsRoute);
app.use("/api/incoming-payments", incomingPaymentsRoute);

app.get("/api/health", (req, res) => {
  res.send("API is working fine.");
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is up and running on PORT: ", PORT);
  });
});
