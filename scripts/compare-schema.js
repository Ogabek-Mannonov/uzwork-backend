// scripts/compare-schema.js
// Сравнение существующих таблиц в БД с schema.sql
const pool = require('../src/db/pool');
const fs = require('fs');
const path = require('path');

async function compareSchema() {
  try {
    console.log('🔍 Сравнение существующих таблиц с schema.sql...\n');
    
    // Получаем существующие таблицы
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('📋 Существующие таблицы в БД:');
    existingTables.forEach(table => {
      console.log(`   ✓ ${table}`);
    });
    
    // Читаем schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Извлекаем имена таблиц из schema.sql
    const tableMatches = schemaSQL.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi);
    const schemaTables = Array.from(tableMatches, m => m[1]);
    
    console.log('\n📄 Таблицы в schema.sql:');
    schemaTables.forEach(table => {
      console.log(`   ✓ ${table}`);
    });
    
    // Сравнение
    console.log('\n📊 Сравнение:');
    const onlyInDB = existingTables.filter(t => !schemaTables.includes(t));
    const onlyInSchema = schemaTables.filter(t => !existingTables.includes(t));
    const inBoth = existingTables.filter(t => schemaTables.includes(t));
    
    if (inBoth.length > 0) {
      console.log(`\n✅ Совпадают (${inBoth.length}):`);
      inBoth.forEach(table => console.log(`   • ${table}`));
    }
    
    if (onlyInDB.length > 0) {
      console.log(`\n⚠️  Только в БД (${onlyInDB.length}):`);
      onlyInDB.forEach(table => console.log(`   • ${table}`));
    }
    
    if (onlyInSchema.length > 0) {
      console.log(`\n⚠️  Только в schema.sql (${onlyInSchema.length}):`);
      onlyInSchema.forEach(table => console.log(`   • ${table}`));
    }
    
    // Проверяем структуру каждой таблицы
    console.log('\n🔍 Детальная информация о таблицах:\n');
    for (const table of existingTables) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`📋 ${table} (${columnsResult.rows.length} колонок):`);
      columnsResult.rows.slice(0, 5).forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`);
      });
      if (columnsResult.rows.length > 5) {
        console.log(`   ... и еще ${columnsResult.rows.length - 5} колонок`);
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

compareSchema();

