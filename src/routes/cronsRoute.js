import express from "express"
import { checkAllUsersForRecurrings } from "../controllers/recurringsController.js";

const router = express.Router();

router.get("/check-all-recurrings-for-users", checkAllUsersForRecurrings);

export default router;