import { Request, Response } from 'express';
import pool from '../config/database';
import { CreateOrderRequest } from '../models/types';
import { AuthenticatedRequest } from '../middleware/auth';

export const getAllOrders = async (req: AuthenticatedRequest, res: Response) => {
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
    
    const queryParams: any[] = [];
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
    queryParams.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders WHERE 1=1';
    const countParams: any[] = [];
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

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Convert snake_case to camelCase and parse numeric fields for frontend
    const orders = result.rows.map(order => ({
      ...order,
      subtotal: parseFloat(order.subtotal),
      tax: parseFloat(order.tax),
      discount: parseFloat(order.discount),
      total: parseFloat(order.total),
      paymentMethod: order.payment_method,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      timestamp: order.created_at, // For compatibility
      items: Array.isArray(order.items) ? order.items.map((item: any) => ({
        ...item,
        quantity: parseInt(item.quantity || '0'),
        unit_price: parseFloat(item.unit_price || '0'),
        total_price: parseFloat(item.total_price || '0'),
        product: {
          id: item.product_id,
          name: item.product_name,
          price: parseFloat(item.unit_price || '0')
        }
      })) : []
    }));

    res.json({
      orders,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
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
      pool.query(orderQuery, [id]),
      pool.query(itemsQuery, [id])
    ]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Convert snake_case to camelCase and parse numeric fields for frontend
    const order = {
      ...orderResult.rows[0],
      subtotal: parseFloat(orderResult.rows[0].subtotal),
      tax: parseFloat(orderResult.rows[0].tax),
      discount: parseFloat(orderResult.rows[0].discount),
      total: parseFloat(orderResult.rows[0].total),
      paymentMethod: orderResult.rows[0].payment_method,
      customerName: orderResult.rows[0].customer_name,
      customerPhone: orderResult.rows[0].customer_phone,
      customerEmail: orderResult.rows[0].customer_email,
      createdAt: orderResult.rows[0].created_at,
      updatedAt: orderResult.rows[0].updated_at,
      timestamp: orderResult.rows[0].created_at, // For compatibility
      items: itemsResult.rows.map(item => ({
        ...item,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price)
      }))
    };

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { items, payment_method, discount = 0, customer_name, customer_phone, customer_email }: CreateOrderRequest = req.body;
    const userId = req.user!.id;

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
      const productResult = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1',
        [item.product_id]
      );

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
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax - discount;

    if (total < 0) {
      throw new Error('Total cannot be negative');
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (subtotal, tax, discount, total, payment_method, user_id, customer_name, customer_phone, customer_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [subtotal, tax, discount, total, payment_method, userId, customer_name || null, customer_phone || null, customer_email || null]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of orderItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
        [order.id, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }

    await client.query('COMMIT');

    // Get complete order with items
    const completeOrderResult = await pool.query(`
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

    // Convert snake_case to camelCase and parse numeric fields for frontend
    const orderData = completeOrderResult.rows[0];
    const orderResponse = {
      ...orderData,
      subtotal: parseFloat(orderData.subtotal),
      tax: parseFloat(orderData.tax),
      discount: parseFloat(orderData.discount),
      total: parseFloat(orderData.total),
      paymentMethod: orderData.payment_method,
      customerName: orderData.customer_name,
      customerPhone: orderData.customer_phone,
      customerEmail: orderData.customer_email,
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at,
      timestamp: orderData.created_at // For compatibility
    };

    res.status(201).json({
      message: 'Order created successfully',
      order: orderResponse
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  } finally {
    client.release();
  }
};

export const getOrderStats = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
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

    const result = await pool.query(statsQuery, queryParams);

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Daily sales analytics
export const getDailySales = async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query; // Default last 30 days
    
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value,
        SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_revenue,
        SUM(CASE WHEN payment_method = 'digital' THEN total ELSE 0 END) as digital_revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(days as string)} days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
    `;

    const result = await pool.query(query);

    res.json({
      daily_sales: result.rows.map(row => ({
        ...row,
        revenue: parseFloat(row.revenue || '0'),
        avg_order_value: parseFloat(row.avg_order_value || '0'),
        cash_revenue: parseFloat(row.cash_revenue || '0'),
        card_revenue: parseFloat(row.card_revenue || '0'),
        digital_revenue: parseFloat(row.digital_revenue || '0'),
        orders_count: parseInt(row.orders_count || '0')
      }))
    });
  } catch (error) {
    console.error('Get daily sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Monthly sales analytics
export const getMonthlySales = async (req: Request, res: Response) => {
  try {
    const { months = '12' } = req.query; // Default last 12 months
    
    const query = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(MONTH FROM created_at) as month_num,
        COUNT(*) as orders_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value,
        SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_revenue,
        SUM(CASE WHEN payment_method = 'digital' THEN total ELSE 0 END) as digital_revenue
      FROM orders 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${parseInt(months as string)} months'
      GROUP BY DATE_TRUNC('month', created_at), EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY month DESC
    `;

    const result = await pool.query(query);

    res.json({
      monthly_sales: result.rows.map(row => ({
        ...row,
        revenue: parseFloat(row.revenue || '0'),
        avg_order_value: parseFloat(row.avg_order_value || '0'),
        cash_revenue: parseFloat(row.cash_revenue || '0'),
        card_revenue: parseFloat(row.card_revenue || '0'),
        digital_revenue: parseFloat(row.digital_revenue || '0'),
        orders_count: parseInt(row.orders_count || '0')
      }))
    });
  } catch (error) {
    console.error('Get monthly sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Yearly sales analytics
export const getYearlySales = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        EXTRACT(YEAR FROM created_at) as year,
        COUNT(*) as orders_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value,
        SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_revenue,
        SUM(CASE WHEN payment_method = 'digital' THEN total ELSE 0 END) as digital_revenue
      FROM orders 
      GROUP BY EXTRACT(YEAR FROM created_at)
      ORDER BY year DESC
    `;

    const result = await pool.query(query);

    res.json({
      yearly_sales: result.rows.map(row => ({
        ...row,
        revenue: parseFloat(row.revenue || '0'),
        avg_order_value: parseFloat(row.avg_order_value || '0'),
        cash_revenue: parseFloat(row.cash_revenue || '0'),
        card_revenue: parseFloat(row.card_revenue || '0'),
        digital_revenue: parseFloat(row.digital_revenue || '0'),
        orders_count: parseInt(row.orders_count || '0')
      }))
    });
  } catch (error) {
    console.error('Get yearly sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Top selling products
export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const { limit = '10', period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'day':
        dateFilter = "AND o.created_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND o.created_at >= CURRENT_DATE - INTERVAL '1 year'";
        break;
    }

    const query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.price,
        SUM(oi.quantity) as total_sold,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT o.id) as orders_count
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE 1=1 ${dateFilter}
      GROUP BY p.id, p.name, p.category, p.price
      ORDER BY total_sold DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit as string)]);

    res.json({
      top_products: result.rows.map(row => ({
        ...row,
        price: parseFloat(row.price || '0'),
        total_revenue: parseFloat(row.total_revenue || '0'),
        total_sold: parseInt(row.total_sold || '0'),
        orders_count: parseInt(row.orders_count || '0')
      })),
      period,
      limit: parseInt(limit as string)
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};