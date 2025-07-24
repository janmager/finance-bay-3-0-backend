import express from "express"
import { createUser, getUserOverview, updateUserBalance } from "../controllers/usersController.js";

const router = express.Router();

router.post("/", createUser);
router.get("/userOverview/:userId", getUserOverview);
router.get("/updateBalance/:userId", updateUserBalance);

export default router;