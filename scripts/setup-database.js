// scripts/setup-database.js
// Скрипт для создания таблиц в базе данных
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

async function setupDatabase() {
  try {
    console.log('🔧 Настройка базы данных...\n');
    
    // Читаем SQL схему
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Чтение schema.sql...');
    
    // Удаляем комментарии из SQL
    let cleanSQL = schemaSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    // Выполняем весь SQL целиком
    console.log('📝 Выполнение SQL схемы...\n');
    
    try {
      await pool.query(cleanSQL);
      console.log('✅ SQL схема выполнена успешно!');
    } catch (error) {
      // Если ошибка связана с "уже существует", это нормально
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate') ||
          error.message.includes('does not exist')) {
        console.log('⚠️  Некоторые объекты уже существуют, продолжаем...');
      } else {
        console.error('❌ Ошибка выполнения SQL:', error.message);
        throw error;
      }
    }
    
    console.log('\n🔍 Проверка созданных таблиц...');
    
    // Проверяем созданные таблицы
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('\n✅ Созданные таблицы:');
      tablesResult.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
    } else {
      console.log('\n⚠️  Таблицы не найдены');
    }
    
    console.log('\n✅ Настройка базы данных завершена!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Критическая ошибка:');
    console.error(error.message);
    console.error('\n💡 Проверьте:');
    console.error('   1. DATABASE_URL в .env файле правильный');
    console.error('   2. База данных создана');
    console.error('   3. Пользователь имеет права на создание таблиц');
    process.exit(1);
  }
}

setupDatabase();

