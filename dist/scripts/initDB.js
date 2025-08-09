"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../config/database"));
async function initializeDatabase() {
    try {
        console.log('🔄 Initializing database...');
        // Test connection first
        console.log('🔗 Testing database connection...');
        const testResult = await database_1.default.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Database connection successful!');
        console.log('📅 Current time:', testResult.rows[0].current_time);
        console.log('🗄️ PostgreSQL version:', testResult.rows[0].pg_version);
        // Read schema file
        const schemaPath = path_1.default.join(__dirname, '../config/schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        // Execute schema
        await database_1.default.query(schema);
        console.log('✅ Database initialized successfully!');
        console.log('📊 Tables created:');
        console.log('   - users');
        console.log('   - products');
        console.log('   - orders');
        console.log('   - order_items');
        console.log('');
        console.log('👤 Default users created:');
        console.log('   - admin / admin@pos.com (password: admin123)');
        console.log('   - cashier1 / cashier1@pos.com (password: cashier123)');
        console.log('');
        console.log('📦 Sample products added to inventory');
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        // Provide helpful error messages
        if (error.code === 'ECONNREFUSED') {
            console.error('🔴 Connection refused - PostgreSQL might not be running');
            console.error('🔧 Solutions:');
            console.error('   1. Check if PostgreSQL service is running');
            console.error('   2. Verify DB_HOST and DB_PORT in .env file');
        }
        else if (error.code === '3D000') {
            console.error('🔴 Database "pos_system" does not exist');
            console.error('🔧 Solutions:');
            console.error('   1. Create database: CREATE DATABASE pos_system;');
            console.error('   2. Or connect to postgres DB first');
        }
        else if (error.code === '28P01') {
            console.error('🔴 Authentication failed');
            console.error('🔧 Solutions:');
            console.error('   1. Check DB_USER and DB_PASSWORD in .env');
            console.error('   2. Verify PostgreSQL user credentials');
        }
        else if (error.code === '28000') {
            console.error('🔴 Invalid authorization specification');
            console.error('🔧 Check username and password');
        }
        console.error('\n📋 Current .env settings:');
        console.error(`   DB_HOST: ${process.env.DB_HOST}`);
        console.error(`   DB_PORT: ${process.env.DB_PORT}`);
        console.error(`   DB_NAME: ${process.env.DB_NAME}`);
        console.error(`   DB_USER: ${process.env.DB_USER}`);
        console.error(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}`);
        process.exit(1);
    }
    finally {
        await database_1.default.end();
    }
}
// Run if called directly
if (require.main === module) {
    initializeDatabase();
}
exports.default = initializeDatabase;
