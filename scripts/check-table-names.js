// scripts/check-table-names.js
require('dotenv').config();
const pool = require('../src/db/pool');

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📋 Таблицы в БД:');
    result.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });
    
    // Check for old table names
    const tableNames = result.rows.map(r => r.table_name);
    const oldTables = ['projects', 'user_profiles', 'reviews'];
    const newTables = ['jobs', 'freelancer_profiles', 'client_profiles'];
    
    console.log('\n⚠️  Проверка совместимости:');
    oldTables.forEach((old, i) => {
      const exists = tableNames.includes(old);
      const newExists = tableNames.includes(newTables[i]);
      console.log(`   ${old}: ${exists ? '✅ есть' : '❌ нет'} → ${newTables[i]}: ${newExists ? '✅ есть' : '❌ нет'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkTables();

