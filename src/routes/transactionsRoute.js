import express from "express"
import { sql } from "../config/db.js";
import { createTransaction, deleteTransaction, getUserDataCalendar, getTransactionDailyGroupedByUserId, getSummaryByUserId, getLastDaysUserTransactions, getUserMostCategoriesStats, getTransactionByUserId, returnTransaction, updateTransaction, searchTransactions } from '../controllers/transactionsController.js'

const router = express.Router();

router.post("/", createTransaction);

router.get("/:userId", getTransactionByUserId);

router.get("/last-days/:userId/:daysBack", getLastDaysUserTransactions)

router.get("/most-categories-stats-this-month/:userId", getUserMostCategoriesStats)

router.delete("/:id", deleteTransaction);

router.get("/calendar/:userId", getUserDataCalendar)

router.get("/summary/:userId", getSummaryByUserId);

router.post("/update-transaction/:userId/:id", updateTransaction);

router.post("/return-transaction/:userId", returnTransaction);

router.get("/day-grouped/:userId", getTransactionDailyGroupedByUserId)

router.post("/search/:userId", searchTransactions);

export default router;