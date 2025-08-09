"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes (for POS usage)
router.get('/', productController_1.getAllProducts);
router.get('/categories', productController_1.getCategories);
router.get('/:id', productController_1.getProductById);
// Protected routes (require authentication)
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'cashier']), productController_1.createProduct);
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'cashier']), productController_1.updateProduct);
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), productController_1.deleteProduct);
exports.default = router;
//# sourceMappingURL=products.js.map