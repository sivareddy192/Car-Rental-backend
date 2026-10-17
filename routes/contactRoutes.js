import express from 'express';
import {
  submitContact,
  getContactMessages,
  markContactRead,
} from '../controllers/contactController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', submitContact);
router.get('/', protect, adminOnly, getContactMessages);
router.patch('/:id/read', protect, adminOnly, markContactRead);

export default router;
