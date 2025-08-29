import express from "express"
import { createUser, getUserOverview, updateUserBalance, getTotalAccountValue, updateUserMonthlyLimit, updateUserUsername, updateUserFCMToken, removeUserFCMToken } from "../controllers/usersController.js";

const router = express.Router();

router.post("/", createUser);
router.get("/userOverview/:userId", getUserOverview);
router.post("/updateBalance/:userId", updateUserBalance);
router.post("/updateMonthlyLimit/:userId", updateUserMonthlyLimit);
router.post("/updateUsername/:userId", updateUserUsername);
router.get("/totalAccountValue/:userId", getTotalAccountValue);
router.post("/fcm-token", updateUserFCMToken);
router.delete("/fcm-token", removeUserFCMToken);

export default router;