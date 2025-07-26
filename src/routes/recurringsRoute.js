import express from "express";
import { createRecurring, getRecurrings } from "../controllers/recurringsController.js";

const router = express.Router();

router.get("/:userId", getRecurrings);
router.post("/:userId", createRecurring);

export default router;
