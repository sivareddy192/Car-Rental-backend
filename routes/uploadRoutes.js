import express from 'express';
import { getCloudinaryUploadSignature } from '../controllers/uploadController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/cloudinary-signature', protect, adminOnly, getCloudinaryUploadSignature);

export default router;
