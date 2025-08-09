import bcrypt from 'bcryptjs';
import pool from '../config/database';

async function createAdmin() {
  try {
    console.log('🔧 Creating/updating admin user...');

    // Delete existing admin user
    await pool.query('DELETE FROM users WHERE username = $1', ['admin']);
    console.log('🗑️ Deleted existing admin user');

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    console.log('🔐 Password hashed');

    // Insert new admin user
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, role`,
      ['admin', 'admin@pos.com', hashedPassword, 'admin']
    );

    console.log('✅ Admin user created:');
    console.log(`   - ID: ${result.rows[0].id}`);
    console.log(`   - Username: ${result.rows[0].username}`);
    console.log(`   - Email: ${result.rows[0].email}`);
    console.log(`   - Role: ${result.rows[0].role}`);

    // Test password immediately
    console.log('\n🧪 Testing password...');
    const testResult = await bcrypt.compare('admin123', hashedPassword);
    console.log(`   Password test: ${testResult ? '✅ PASS' : '❌ FAIL'}`);

    // Also create/update cashier
    await pool.query('DELETE FROM users WHERE username = $1', ['cashier1']);
    const cashierHash = await bcrypt.hash('cashier123', saltRounds);
    await pool.query(
      `INSERT INTO users (username, email, password, role) 
       VALUES ($1, $2, $3, $4)`,
      ['cashier1', 'cashier1@pos.com', cashierHash, 'cashier']
    );
    console.log('✅ Cashier user created');

    console.log('\n🎯 Login credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Cashier: cashier1 / cashier123');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();
