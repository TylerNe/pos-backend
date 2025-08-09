"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All order routes require authentication
router.use(auth_1.authenticateToken);
// Get all orders
router.get('/', (0, auth_1.requireRole)(['admin', 'cashier']), orderController_1.getAllOrders);
// Get order statistics
router.get('/stats', (0, auth_1.requireRole)(['admin', 'cashier']), orderController_1.getOrderStats);
// Get specific order
router.get('/:id', (0, auth_1.requireRole)(['admin', 'cashier']), orderController_1.getOrderById);
// Create new order
router.post('/', (0, auth_1.requireRole)(['admin', 'cashier']), orderController_1.createOrder);
exports.default = router;
//# sourceMappingURL=orders.js.map