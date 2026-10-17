import express from 'express';
import {
  getDashboardAnalytics,
  getCustomers,
  updateCustomerRole,
  getAuditLogs,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/analytics', getDashboardAnalytics);
router.get('/customers', getCustomers);
router.patch('/customers/:id/role', updateCustomerRole);
router.get('/audit-logs', getAuditLogs);

export default router;
