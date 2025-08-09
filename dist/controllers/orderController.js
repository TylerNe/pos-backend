"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderStats = exports.createOrder = exports.getOrderById = exports.getAllOrders = void 0;
const database_1 = __importDefault(require("../config/database"));
const getAllOrders = async (req, res) => {
    try {
        const { limit = '50', offset = '0', start_date, end_date } = req.query;
        let query = `
      SELECT 
        o.*,
        u.username as cashier_name,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1
    `;
        const queryParams = [];
        let paramIndex = 1;
        if (start_date) {
            query += ` AND o.created_at >= $${paramIndex}`;
            queryParams.push(start_date);
            paramIndex++;
        }
        if (end_date) {
            query += ` AND o.created_at <= $${paramIndex}`;
            queryParams.push(end_date);
            paramIndex++;
        }
        query += ` 
      GROUP BY o.id, u.username
      ORDER BY o.created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        queryParams.push(parseInt(limit), parseInt(offset));
        const result = await database_1.default.query(query, queryParams);
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM orders WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;
        if (start_date) {
            countQuery += ` AND created_at >= $${countParamIndex}`;
            countParams.push(start_date);
            countParamIndex++;
        }
        if (end_date) {
            countQuery += ` AND created_at <= $${countParamIndex}`;
            countParams.push(end_date);
        }
        const countResult = await database_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        res.json({
            orders: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const orderQuery = `
      SELECT 
        o.*,
        u.username as cashier_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
        const itemsQuery = `
      SELECT 
        oi.*,
        p.name as product_name,
        p.category as product_category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
        const [orderResult, itemsResult] = await Promise.all([
            database_1.default.query(orderQuery, [id]),
            database_1.default.query(itemsQuery, [id])
        ]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = {
            ...orderResult.rows[0],
            items: itemsResult.rows
        };
        res.json({ order });
    }
    catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOrderById = getOrderById;
const createOrder = async (req, res) => {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const { items, payment_method, discount = 0, customer_name, customer_phone, customer_email } = req.body;
        const userId = req.user.id;
        // Validation
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Order must contain at least one item' });
        }
        if (!['cash', 'card', 'digital'].includes(payment_method)) {
            return res.status(400).json({ error: 'Invalid payment method' });
        }
        // Calculate totals
        let subtotal = 0;
        const orderItems = [];
        for (const item of items) {
            // Get product details and check stock
            const productResult = await client.query('SELECT id, name, price, stock FROM products WHERE id = $1', [item.product_id]);
            if (productResult.rows.length === 0) {
                throw new Error(`Product with ID ${item.product_id} not found`);
            }
            const product = productResult.rows[0];
            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${product.name}`);
            }
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            orderItems.push({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: product.price,
                total_price: itemTotal
            });
            // Update product stock
            await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
        }
        const tax = subtotal * 0.1; // 10% tax
        const total = subtotal + tax - discount;
        if (total < 0) {
            throw new Error('Total cannot be negative');
        }
        // Create order
        const orderResult = await client.query(`INSERT INTO orders (subtotal, tax, discount, total, payment_method, user_id, customer_name, customer_phone, customer_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [subtotal, tax, discount, total, payment_method, userId, customer_name || null, customer_phone || null, customer_email || null]);
        const order = orderResult.rows[0];
        // Create order items
        for (const item of orderItems) {
            await client.query('INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)', [order.id, item.product_id, item.quantity, item.unit_price, item.total_price]);
        }
        await client.query('COMMIT');
        // Get complete order with items
        const completeOrderResult = await database_1.default.query(`
      SELECT 
        o.*,
        u.username as cashier_name,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id, u.username
    `, [order.id]);
        res.status(201).json({
            message: 'Order created successfully',
            order: completeOrderResult.rows[0]
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Create order error:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
    finally {
        client.release();
    }
};
exports.createOrder = createOrder;
const getOrderStats = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let whereClause = 'WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;
        if (start_date) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            queryParams.push(start_date);
            paramIndex++;
        }
        if (end_date) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            queryParams.push(end_date);
        }
        const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total) as total_revenue,
        AVG(total) as average_order_value,
        SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cash_orders,
        SUM(CASE WHEN payment_method = 'card' THEN 1 ELSE 0 END) as card_orders,
        SUM(CASE WHEN payment_method = 'digital' THEN 1 ELSE 0 END) as digital_orders
      FROM orders ${whereClause}
    `;
        const result = await database_1.default.query(statsQuery, queryParams);
        res.json({ stats: result.rows[0] });
    }
    catch (error) {
        console.error('Get order stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getOrderStats = getOrderStats;
//# sourceMappingURL=orderController.js.map