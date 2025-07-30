import express from "express";
import { createRecurring, deleteRecurring, getRecurrings } from "../controllers/recurringsController.js";

const router = express.Router();

router.get("/:userId", getRecurrings);
router.post("/:userId", createRecurring);
router.delete("/:recurringId", deleteRecurring);

export default router;
