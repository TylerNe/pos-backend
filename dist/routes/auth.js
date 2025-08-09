"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Protected routes
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
// Admin-only user management routes
router.get('/users', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), authController_1.getAllUsers);
router.post('/users', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), authController_1.createUser);
router.put('/users/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), authController_1.updateUser);
router.delete('/users/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), authController_1.deleteUser);
exports.default = router;
