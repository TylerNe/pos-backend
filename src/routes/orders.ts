import express from 'express';
import {
  getAllOrders,
  getOrderById,
  createOrder,
  getOrderStats,
  getDailySales,
  getMonthlySales,
  getYearlySales,
  getTopProducts
} from '../controllers/orderController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// All order routes require authentication
router.use(authenticateToken);

// Get all orders
router.get('/', requireRole(['admin', 'cashier']), getAllOrders);

// Get order statistics
router.get('/stats', requireRole(['admin', 'cashier']), getOrderStats);

// Analytics endpoints (Admin only)
router.get('/analytics/daily', requireRole(['admin']), getDailySales);
router.get('/analytics/monthly', requireRole(['admin']), getMonthlySales);
router.get('/analytics/yearly', requireRole(['admin']), getYearlySales);
router.get('/analytics/top-products', requireRole(['admin']), getTopProducts);

// Get specific order
router.get('/:id', requireRole(['admin', 'cashier']), getOrderById);

// Create new order
router.post('/', requireRole(['admin', 'cashier']), createOrder);

export default router;
