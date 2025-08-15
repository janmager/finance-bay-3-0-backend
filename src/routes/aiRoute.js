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
router.post('/', (req, res, next) => {
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Request files:', req.files);
  next();
}, upload.any(), processAIRequest);

export default router;
