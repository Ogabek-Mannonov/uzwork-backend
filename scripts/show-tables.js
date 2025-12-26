// scripts/show-tables.js
// Скрипт для просмотра всех таблиц в базе данных
const pool = require('../src/db/pool');

async function showTables() {
  try {
    console.log('📊 Таблицы в базе данных:\n');
    
    // Получаем список всех таблиц
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
      console.log('⚠️  Таблицы не найдены');
      process.exit(0);
    }
    
    console.log(`Найдено таблиц: ${tablesResult.rows.length}\n`);
    console.log('═'.repeat(80));
    
    // Для каждой таблицы показываем структуру
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      const columnCount = table.column_count;
      
      console.log(`\n📋 Таблица: ${tableName}`);
      console.log(`   Колонок: ${columnCount}`);
      console.log('-'.repeat(80));
      
      // Получаем колонки таблицы
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      console.log('   Колонки:');
      columnsResult.rows.forEach(col => {
        let type = col.data_type;
        if (col.character_maximum_length) {
          type += `(${col.character_maximum_length})`;
        }
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`     • ${col.column_name.padEnd(25)} ${type.padEnd(20)} ${nullable}${defaultVal}`);
      });
      
      // Получаем количество записей
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0].count;
        console.log(`   Записей: ${count}`);
      } catch (e) {
        console.log(`   Записей: не удалось подсчитать`);
      }
      
      // Получаем индексы
      const indexesResult = await pool.query(`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = $1
        AND schemaname = 'public'
        ORDER BY indexname
      `, [tableName]);
      
      if (indexesResult.rows.length > 0) {
        console.log(`   Индексы (${indexesResult.rows.length}):`);
        indexesResult.rows.forEach(idx => {
          console.log(`     • ${idx.indexname}`);
        });
      }
      
      // Получаем внешние ключи
      const fkResult = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND tc.table_schema = 'public'
      `, [tableName]);
      
      if (fkResult.rows.length > 0) {
        console.log(`   Внешние ключи (${fkResult.rows.length}):`);
        fkResult.rows.forEach(fk => {
          console.log(`     • ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Готово!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка:');
    console.error(error.message);
    process.exit(1);
  }
}

showTables();



