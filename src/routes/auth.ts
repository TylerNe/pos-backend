import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/authController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

// Admin-only user management routes
router.get('/users', authenticateToken, requireRole(['admin']), getAllUsers);
router.post('/users', authenticateToken, requireRole(['admin']), createUser);
router.put('/users/:id', authenticateToken, requireRole(['admin']), updateUser);
router.delete('/users/:id', authenticateToken, requireRole(['admin']), deleteUser);

export default router;
