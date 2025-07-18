import express from "express"
import { sql } from "../config/db.js";
import { createUser } from "../controllers/usersController.js";

const router = express.Router();

router.post("/", createUser);
export default router;