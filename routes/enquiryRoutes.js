import express from 'express';
import {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
} from '../controllers/enquiryController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createEnquiry);
router.get('/', protect, adminOnly, getEnquiries);
router.patch('/:id', protect, adminOnly, updateEnquiryStatus);

export default router;
