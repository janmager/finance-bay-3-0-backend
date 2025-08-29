import express from "express"
import { checkAllUsersForRecurrings } from "../controllers/recurringsController.js";
import { checkUpcomingPaymentsAndNotify } from "../controllers/upcomingPaymentsNotificationsController.js";

const router = express.Router();

router.get("/check-all-recurrings-for-users", checkAllUsersForRecurrings);

// Endpoint do ręcznego uruchomienia sprawdzania nadchodzących płatności
router.post("/check-upcoming-payments", async (req, res) => {
  try {
    console.log('🔔 Manual trigger of upcoming payments check');
    await checkUpcomingPaymentsAndNotify();
    res.status(200).json({ 
      message: "Upcoming payments check completed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in manual upcoming payments check:', error);
    res.status(500).json({ 
      message: "Error checking upcoming payments", 
      error: error.message 
    });
  }
});

export default router;