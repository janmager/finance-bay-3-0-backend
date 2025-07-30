import express from "express"
import { getUserBalancesLogs } from "../controllers/balancesLogsController.js";

const router = express.Router();

router.get("/get/:userId", getUserBalancesLogs);

export default router;