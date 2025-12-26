// scripts/check-missing-tables.js
// Проверяет какие таблицы отсутствуют в БД
require('dotenv').config();
const pool = require('../src/db/pool');

const requiredTables = [
  'messages',
  'payments',
  'user_balances',
  'marketplace',
  'marketplace_purchases',
  'notifications',
  'disputes',
  'saved_items',
  'support_tickets',
  'currency_rates',
  'project_boosts',
  'premium_subscriptions',
  'contract_milestones',
  'file_uploads'
];

async function checkMissingTables() {
  try {
    console.log('🔍 Проверка отсутствующих таблиц...\n');

    // Get existing tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const existingTables = result.rows.map(row => row.table_name);
    
    console.log('✅ Существующие таблицы:');
    existingTables.forEach(table => {
      console.log(`   • ${table}`);
    });

    console.log('\n📋 Требуемые новые таблицы:');
    const missing = [];
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table} - уже существует`);
      } else {
        console.log(`   ❌ ${table} - отсутствует`);
        missing.push(table);
      }
    });

    if (missing.length === 0) {
      console.log('\n✅ Все таблицы уже созданы!');
    } else {
      console.log(`\n⚠️  Отсутствует ${missing.length} таблиц.`);
      console.log('   Запустите: npm run setup-extended-db');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkMissingTables();


