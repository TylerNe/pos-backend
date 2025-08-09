"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const database_1 = __importDefault(require("../config/database"));
const getAllProducts = async (req, res) => {
    try {
        const { category, search, limit = '50', offset = '0' } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;
        if (category) {
            query += ` AND category = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }
        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(parseInt(limit), parseInt(offset));
        const result = await database_1.default.query(query, queryParams);
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM products WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        if (category) {
            countQuery += ` AND category = $${countParamIndex}`;
            countParams.push(category);
            countParamIndex++;
        }
        if (search) {
            countQuery += ` AND (name ILIKE $${countParamIndex} OR category ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
        }
        const countResult = await database_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        // Convert price to number for frontend
        const products = result.rows.map(product => ({
            ...product,
            price: parseFloat(product.price)
        }));
        res.json({
            products,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });
    }
    catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllProducts = getAllProducts;
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.default.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Convert price to number for frontend
        const product = {
            ...result.rows[0],
            price: parseFloat(result.rows[0].price)
        };
        res.json({ product });
    }
    catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    try {
        const { name, price, category, stock, image, barcode } = req.body;
        // Validation
        if (!name || !category || price === undefined || stock === undefined) {
            return res.status(400).json({ error: 'Name, price, category, and stock are required' });
        }
        if (price < 0 || stock < 0) {
            return res.status(400).json({ error: 'Price and stock must be non-negative' });
        }
        // Check if barcode already exists
        if (barcode) {
            const existingProduct = await database_1.default.query('SELECT id FROM products WHERE barcode = $1', [barcode]);
            if (existingProduct.rows.length > 0) {
                return res.status(400).json({ error: 'Barcode already exists' });
            }
        }
        const result = await database_1.default.query('INSERT INTO products (name, price, category, stock, image, barcode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, price, category, stock, image || null, barcode || null]);
        res.status(201).json({
            message: 'Product created successfully',
            product: result.rows[0]
        });
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Check if product exists
        const existingProduct = await database_1.default.query('SELECT * FROM products WHERE id = $1', [id]);
        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Validation
        if (updates.price !== undefined && updates.price < 0) {
            return res.status(400).json({ error: 'Price must be non-negative' });
        }
        if (updates.stock !== undefined && updates.stock < 0) {
            return res.status(400).json({ error: 'Stock must be non-negative' });
        }
        // Check if barcode already exists (for different product)
        if (updates.barcode) {
            const barcodeCheck = await database_1.default.query('SELECT id FROM products WHERE barcode = $1 AND id != $2', [updates.barcode, id]);
            if (barcodeCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Barcode already exists' });
            }
        }
        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
            }
        });
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);
        const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await database_1.default.query(query, updateValues);
        res.json({
            message: 'Product updated successfully',
            product: result.rows[0]
        });
    }
    catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.default.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteProduct = deleteProduct;
const getCategories = async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT DISTINCT category FROM products ORDER BY category');
        res.json({ categories: result.rows.map(row => row.category) });
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCategories = getCategories;
