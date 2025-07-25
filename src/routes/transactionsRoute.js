import express from "express"
import { sql } from "../config/db.js";
import { createTransaction, deleteTransaction, getTransactionDailyGroupedByUserId, getSummaryByUserId, getLastDaysUserTransactions, getUserMostCategoriesStats, getTransactionByUserId } from '../controllers/transactionsController.js'

const router = express.Router();

router.post("/", createTransaction);

router.get("/:userId", getTransactionByUserId);

router.get("/last-days/:userId/:daysBack", getLastDaysUserTransactions)

router.get("/most-categories-stats-this-month/:userId", getUserMostCategoriesStats)

router.delete("/:id", deleteTransaction);

router.get("/summary/:userId", getSummaryByUserId);

router.get("/day-grouped/:userId", getTransactionDailyGroupedByUserId)

export default router;