// scripts/setup-extended-db.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../src/db/pool');

async function setupExtendedDatabase() {
  try {
    console.log('📊 Расширенная схема БД yuklanmoqda...\n');

    const schemaPath = path.join(__dirname, '..', 'database', 'schema_extended.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ schema_extended.sql fayli topilmadi!');
      process.exit(1);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schemaSQL);

    console.log('✅ Расширенная схема БД muvaffaqiyatli yaratildi!\n');

    // Show created tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 Yaratilgan jadvalar:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupExtendedDatabase();

