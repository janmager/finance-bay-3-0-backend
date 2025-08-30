import express from "express"
import { createUser, getUserOverview, updateUserBalance, getTotalAccountValue, updateUserMonthlyLimit, updateUserUsername, updateUserFCMToken, removeUserFCMToken } from "../controllers/usersController.js";
import { sendNotificationToUser } from "../config/firebase.js";
import { testUpcomingPaymentsNotification } from "../controllers/upcomingPaymentsNotificationsController.js";
import { checkMonthlyLimitAndNotify } from "../controllers/transactionsController.js";

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

// Test endpoint for upcoming payments notifications
router.post("/test-upcoming-payments/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await testUpcomingPaymentsNotification(userId);
    res.status(200).json({
      message: "Upcoming payments test notification sent",
      result
    });
  } catch (error) {
    console.error("Error sending upcoming payments test notification:", error);
    res.status(500).json({ 
      message: "Error sending upcoming payments test notification", 
      error: error.message 
    });
  }
});

// Test endpoint for monthly limit notifications
router.post("/monthly-limit/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🧪 Monthly limit notification for user ${userId}`);
    
    // Wywołaj funkcję sprawdzania limitu miesięcznego
    await checkMonthlyLimitAndNotify(userId);
    
    res.status(200).json({
      message: "Monthly limit test completed",
      success: true
    });
  } catch (error) {
    console.error("Error testing monthly limit notification:", error);
    res.status(500).json({ 
      message: "Error testing monthly limit notification", 
      error: error.message 
    });
  }
});

export default router;