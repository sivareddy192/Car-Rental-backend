import express from 'express';
import {
  getVehicleReviews,
  submitReview,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/vehicle/:vehicleId', getVehicleReviews);
router.post('/', protect, submitReview);

export default router;
