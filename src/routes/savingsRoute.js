import express from "express"
import { createSaving, getUserSavings } from "../controllers/savingsController.js";

const router = express.Router();

router.get("/:userId", getUserSavings);
router.post("/:userId", createSaving);

export default router;