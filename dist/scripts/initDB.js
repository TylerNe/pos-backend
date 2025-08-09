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
        console.error('❌ Database initialization failed:', error);
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
//# sourceMappingURL=initDB.js.map