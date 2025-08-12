import express from "express"
import { getIncomingPaymentsByUserId, deleteIncomingPayment, createIncomingPayment } from '../controllers/incomingPaymentsController.js'

const router = express.Router();

router.post("/", createIncomingPayment);
router.get("/:userId", getIncomingPaymentsByUserId);
router.delete("/:userId/:id", deleteIncomingPayment);

export default router;
