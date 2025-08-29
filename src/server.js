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
import incomingIncomesRoute from "./routes/incomingIncomesRoute.js";
import aiRoute from "./routes/aiRoute.js";
import aiLogsRoute from "./routes/aiLogsRoute.js";
import whatsappRoute from "./routes/whatsappRoute.js";
import currenciesRoute from "./routes/currenciesRoute.js";
import foreignCurrenciesRoute from "./routes/foreignCurrenciesRoute.js";
import cors from "cors";
import { checkUsersRecurrings, saveUsersWalletsBalances, wakeupJob, saveUsersAccountsValueAll, checkUsersIncomingPayments, checkUsersIncomingIncomes, refreshCurrenciesDaily } from "./config/cron.js";
import { initializeCurrencies } from "./controllers/currenciesController.js";
import bodyParser from "body-parser";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(rateLimiter);

let test = false;

if (process.env.NODE_ENV === "production" || test) {
  wakeupJob.start();
  checkUsersRecurrings.start();
  saveUsersWalletsBalances.start();
  saveUsersAccountsValueAll.start();
  checkUsersIncomingPayments.start();
  checkUsersIncomingIncomes.start();
  refreshCurrenciesDaily.start();
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
app.use("/api/incoming-incomes", incomingIncomesRoute);
app.use("/api/ai", aiRoute);
app.use("/api/ai-logs", aiLogsRoute);
app.use("/api/whatsapp", whatsappRoute);
app.use("/api/currencies", currenciesRoute);
app.use("/api/foreign-currencies", foreignCurrenciesRoute);

app.get("/api/health", (req, res) => {
  res.send("API is working fine.");
});

initDB().then(async () => {
  try {
    // Initialize currencies table with initial data
    await initializeCurrencies();
    console.log("Currencies initialized successfully");
  } catch (error) {
    console.error("Error initializing currencies:", error);
  }
  
  app.listen(PORT, () => {
    console.log("Server is up and running on PORT: ", PORT);
  });
});
