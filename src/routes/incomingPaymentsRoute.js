import express from "express"
import { getIncomingPaymentsByUserId, deleteIncomingPayment, createIncomingPayment, settleIncomingPayment } from '../controllers/incomingPaymentsController.js'

const router = express.Router();

router.post("/", createIncomingPayment);
router.get("/:userId", getIncomingPaymentsByUserId);
router.delete("/:userId/:id", deleteIncomingPayment);
router.post("/settle/:userId/:id", settleIncomingPayment);

export default router;
