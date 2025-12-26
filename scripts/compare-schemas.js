// scripts/compare-schemas.js
// Сравнивает существующую структуру БД с новой схемой
require('dotenv').config();
const pool = require('../src/db/pool');

async function compareSchemas() {
  try {
    console.log('🔍 Сравнение существующей БД с новой схемой...\n');

    // Check users table structure
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📋 Таблица users - существующие колонки:');
    usersColumns.rows.forEach(col => {
      console.log(`   • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check if username exists (required in new schema)
    const hasUsername = usersColumns.rows.some(col => col.column_name === 'username');
    const hasDisplayName = usersColumns.rows.some(col => col.column_name === 'display_name');
    const hasBalanceUzs = usersColumns.rows.some(col => col.column_name === 'balance_uzs');
    const hasBalanceUsd = usersColumns.rows.some(col => col.column_name === 'balance_usd');

    console.log('\n✅ Проверка обязательных полей новой схемы:');
    console.log(`   username: ${hasUsername ? '✅' : '❌'}`);
    console.log(`   display_name: ${hasDisplayName ? '✅' : '❌'}`);
    console.log(`   balance_uzs: ${hasBalanceUzs ? '✅' : '❌'}`);
    console.log(`   balance_usd: ${hasBalanceUsd ? '✅' : '❌'}`);

    // Check users count
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 Записей в users: ${usersCount.rows[0].count}`);

    if (usersCount.rows[0].count > 0) {
      console.log('\n⚠️  В таблице users есть данные!');
      console.log('   Если структура отличается, нужна миграция данных.');
    }

    // Check if all required tables exist
    const requiredTables = [
      'users', 'freelancer_profiles', 'client_profiles', 'skills', 
      'user_skills', 'jobs', 'job_skills', 'proposals', 'contracts',
      'milestones', 'transactions', 'chats', 'messages', 
      'marketplace_items', 'disputes', 'notifications'
    ];

    const existingTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const existingTableNames = existingTables.rows.map(r => r.table_name);

    console.log('\n📋 Проверка всех таблиц:');
    let allTablesExist = true;
    requiredTables.forEach(table => {
      const exists = existingTableNames.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      if (!exists) allTablesExist = false;
    });

    if (allTablesExist && hasUsername && hasDisplayName && hasBalanceUzs && hasBalanceUsd) {
      console.log('\n✅ Новая схема уже применена! Все таблицы и поля на месте.');
    } else {
      console.log('\n⚠️  Структура отличается от новой схемы.');
      console.log('   Нужно обновить схему или применить миграцию.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

compareSchemas();

