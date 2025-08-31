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
    // Accept image files and PDF files
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDF files are allowed'), false);
    }
  }
});

// POST /api/ai - Process AI request with text and image
// Accept any field name for the image file
router.post('/', upload.any(), async (req, res, next) => {
  try {
    // Ensure form fields are parsed correctly
    if (!req.body || !req.files) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    // Process the request by calling the controller function directly
    await processAIRequest(req, res);
  } catch (error) {
    console.error('Error processing AI request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
