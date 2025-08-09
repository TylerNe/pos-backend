import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');

    // Drop all tables first
    console.log('🗑️ Dropping existing tables...');
    await pool.query(`
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Tables dropped');

    // Read and execute schema
    console.log('📊 Creating fresh tables...');
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);

    console.log('✅ Database reset successfully!');
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
    
  } catch (error: any) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase();
}

export default resetDatabase;
