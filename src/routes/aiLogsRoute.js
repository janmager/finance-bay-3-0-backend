import express from 'express';
import { getAILogsByUser, addAILog } from '../controllers/aiLogsController.js';

const router = express.Router();

// GET /api/ai-logs - Get all AI logs for a specific user
router.get('/', getAILogsByUser);

// POST /api/ai-logs - Add new AI log record
router.post('/', addAILog);

export default router;
