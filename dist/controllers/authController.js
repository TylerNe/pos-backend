"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getAllUsers = exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const register = async (req, res) => {
    try {
        const { username, email, password, role = 'cashier' } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        // Check if user exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const result = await database_1.default.query('INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at', [username, email, hashedPassword, role]);
        const user = result.rows[0];
        // Generate JWT
        const payload = { userId: user.id, username: user.username, role: user.role };
        const secret = process.env.JWT_SECRET;
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '7d' });
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            },
            token
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        // Find user
        const result = await database_1.default.query('SELECT id, username, email, password, role FROM users WHERE username = $1 OR email = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT
        const payload = { userId: user.id, username: user.username, role: user.role };
        const secret = process.env.JWT_SECRET;
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '7d' });
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await database_1.default.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
// Admin-only functions for user management
const getAllUsers = async (req, res) => {
    try {
        const { limit = '50', offset = '0' } = req.query;
        const result = await database_1.default.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), parseInt(offset)]);
        // Get total count
        const countResult = await database_1.default.query('SELECT COUNT(*) FROM users');
        const total = parseInt(countResult.rows[0].count);
        res.json({
            users: result.rows,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllUsers = getAllUsers;
const createUser = async (req, res) => {
    try {
        const { username, email, password, role = 'cashier' } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!['admin', 'cashier'].includes(role)) {
            return res.status(400).json({ error: 'Role must be either admin or cashier' });
        }
        // Check if user exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const result = await database_1.default.query('INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at', [username, email, hashedPassword, role]);
        const user = result.rows[0];
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            }
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, password } = req.body;
        // Validation
        if (!username || !email || !role) {
            return res.status(400).json({ error: 'Username, email, and role are required' });
        }
        if (!['admin', 'cashier'].includes(role)) {
            return res.status(400).json({ error: 'Role must be either admin or cashier' });
        }
        // Check if user exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if username/email is taken by another user
        const duplicateCheck = await database_1.default.query('SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3', [username, email, id]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        let query = 'UPDATE users SET username = $1, email = $2, role = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, username, email, role, created_at, updated_at';
        let queryParams = [username, email, role, id];
        // If password is provided, update it too
        if (password && password.trim() !== '') {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            query = 'UPDATE users SET username = $1, email = $2, role = $3, password = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, username, email, role, created_at, updated_at';
            queryParams = [username, email, role, hashedPassword, id];
        }
        const result = await database_1.default.query(query, queryParams);
        res.json({
            message: 'User updated successfully',
            user: result.rows[0]
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = await database_1.default.query('SELECT id, role FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prevent deleting the last admin
        if (existingUser.rows[0].role === 'admin') {
            const adminCount = await database_1.default.query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
            if (parseInt(adminCount.rows[0].count) <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin user' });
            }
        }
        await database_1.default.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteUser = deleteUser;
