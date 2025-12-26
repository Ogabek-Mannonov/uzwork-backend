// scripts/setup-new-schema.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../src/db/pool');

async function setupNewSchema() {
  try {
    console.log('📊 New schema yuklanmoqda...\n');

    const schemaPath = path.join(__dirname, '..', 'database', 'schema_new.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ schema_new.sql fayli topilmadi!');
      process.exit(1);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schemaSQL);

    console.log('✅ New schema muvaffaqiyatli yaratildi!\n');

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

    console.log('\n⚠️  Eslatma: Bu yangi schema UUID ishlatadi!');
    console.log('   Eski schema (INTEGER ID) bilan mos kelmaydi.');
    console.log('   Agar eski ma\'lumotlar bor bo\'lsa, ularni migrate qilish kerak.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupNewSchema();


