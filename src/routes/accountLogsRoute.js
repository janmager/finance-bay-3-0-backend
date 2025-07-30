import express from "express"
import { getUserAccountLogs } from "../controllers/accountLogsController.js";

const router = express.Router();

router.get("/get/:userId", getUserAccountLogs);

export default router;