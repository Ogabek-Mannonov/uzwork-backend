// scripts/check-existing-tables.js
// Проверка существующих таблиц БЕЗ создания новых
const pool = require('../src/db/pool');

async function checkExisting() {
  try {
    console.log('🔍 Проверка существующих таблиц в базе данных Render...\n');
    
    // Проверяем существующие таблицы
    const tablesResult = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) 
         FROM information_schema.columns 
         WHERE table_name = t.table_name 
         AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  Таблицы не найдены в базе данных');
      process.exit(0);
    }
    
    console.log(`✅ Найдено таблиц: ${tablesResult.rows.length}\n`);
    
    for (const table of tablesResult.rows) {
      // Проверяем количество записей
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        const count = countResult.rows[0].count;
        console.log(`📋 ${table.table_name.padEnd(25)} - ${table.column_count} колонок, ${count} записей`);
      } catch (e) {
        console.log(`📋 ${table.table_name.padEnd(25)} - ${table.column_count} колонок`);
      }
    }
    
    console.log('\n✅ Проверка завершена');
    console.log('\n💡 Это ваша база данных Render, указанная в DATABASE_URL');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkExisting();



