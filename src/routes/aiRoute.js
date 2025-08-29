import express from 'express';
import multer from 'multer';
import { processAIRequest } from '../controllers/aiController.js';

const router = express.Router();

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST /api/ai - Process AI request with text and image
// Accept any field name for the image file
router.post('/', upload.any(), async (req, res, next) => {
  try {
    // Process the request
    const result = await processAIRequest(req.body, req.files);
    res.json(result);
  } catch (error) {
    console.error('Error processing AI request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
