import express from "express";
import {
  createSaving,
  deleteSaving,
  getUserSavings,
  depositToSaving,
  withdrawFromSaving,
  updateSaving,
} from "../controllers/savingsController.js";

const router = express.Router();

router.get("/:userId", getUserSavings);
router.post("/:userId", createSaving);
router.put("/:id/:userId", updateSaving);
router.delete("/:id/:userId", deleteSaving);
router.post("/deposit/:userId", depositToSaving);
router.post("/withdraw/:userId", withdrawFromSaving);

export default router;
