import express from "express"
import { createUser, getUserOverview, updateUserBalance, getTotalAccountValue, updateUserMonthlyLimit, updateUserUsername, updateUserFCMToken, removeUserFCMToken } from "../controllers/usersController.js";
import { sendNotificationToUser } from "../config/firebase.js";

const router = express.Router();

router.post("/", createUser);
router.get("/userOverview/:userId", getUserOverview);
router.post("/updateBalance/:userId", updateUserBalance);
router.post("/updateMonthlyLimit/:userId", updateUserMonthlyLimit);
router.post("/updateUsername/:userId", updateUserUsername);
router.get("/totalAccountValue/:userId", getTotalAccountValue);
router.post("/fcm-token", updateUserFCMToken);
router.delete("/fcm-token", removeUserFCMToken);

// Test endpoint for sending notifications
router.post("/test-notification/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, body } = req.body;
    
    const notification = {
      title: title || "Test Notification",
      body: body || "This is a test notification from Finance Bay",
      data: {
        test: "true",
        timestamp: new Date().toISOString()
      }
    };
    
    const result = await sendNotificationToUser(userId, notification);
    res.status(200).json({
      message: "Test notification sent",
      result
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({ 
      message: "Error sending test notification", 
      error: error.message 
    });
  }
});

export default router;