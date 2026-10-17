import express from 'express';
import {
  listVehicles,
  getVehicleById,
  checkVehicleAvailability,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  blockVehicleDates,
} from '../controllers/vehicleController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', listVehicles);
router.get('/:id', getVehicleById);
router.get('/:id/availability', checkVehicleAvailability);

// Admin-only fleet management
router.post('/', protect, adminOnly, createVehicle);
router.put('/:id', protect, adminOnly, updateVehicle);
router.delete('/:id', protect, adminOnly, deleteVehicle);
router.post('/block-dates', protect, adminOnly, blockVehicleDates);

export default router;
