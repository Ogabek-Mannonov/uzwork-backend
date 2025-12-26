// scripts/check-db.js
// Скрипт для проверки подключения к базе данных
const pool = require('../src/db/pool');

async function checkDatabase() {
  try {
    console.log('🔍 Проверка подключения к базе данных...');
    
    // Проверка подключения
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Подключение успешно!');
    console.log('📅 Текущее время БД:', result.rows[0].current_time);
    console.log('📦 Версия PostgreSQL:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
    
    // Проверка таблиц
    console.log('\n🔍 Проверка таблиц...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('⚠️  Таблицы не найдены! Выполните schema.sql');
    } else {
      console.log('✅ Найдено таблиц:', tables.rows.length);
      tables.rows.forEach(row => {
        console.log('   -', row.table_name);
      });
    }
    
    // Проверка количества записей
    console.log('\n📊 Статистика:');
    try {
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log('   👥 Пользователей:', usersCount.rows[0].count);
    } catch (e) {
      console.log('   ⚠️  Таблица users не найдена');
    }
    
    try {
      const projectsCount = await pool.query('SELECT COUNT(*) FROM projects');
      console.log('   📁 Проектов:', projectsCount.rows[0].count);
    } catch (e) {
      console.log('   ⚠️  Таблица projects не найдена');
    }
    
    console.log('\n✅ Проверка завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:');
    console.error('   ', error.message);
    console.error('\n💡 Проверьте:');
    console.error('   1. PostgreSQL запущен');
    console.error('   2. DATABASE_URL в .env файле правильный');
    console.error('   3. База данных создана');
    process.exit(1);
  }
}

checkDatabase();


