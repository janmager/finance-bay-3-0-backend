import express from "express"
import { getIncomingIncomesByUserId, deleteIncomingIncome, createIncomingIncome, settleIncomingIncome } from '../controllers/incomingIncomesController.js'

const router = express.Router();

router.post("/", createIncomingIncome);
router.get("/:userId", getIncomingIncomesByUserId);
router.delete("/:userId/:id", deleteIncomingIncome);
router.post("/settle/:userId/:id", settleIncomingIncome);

export default router; 
