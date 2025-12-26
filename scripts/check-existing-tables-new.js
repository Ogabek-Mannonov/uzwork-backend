// scripts/check-existing-tables-new.js
// Проверяет существующие таблицы перед применением новой схемы
require('dotenv').config();
const pool = require('../src/db/pool');

async function checkExistingTables() {
  try {
    console.log('🔍 Проверка существующих таблиц...\n');

    // Get existing tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const existingTables = result.rows.map(row => row.table_name);
    
    console.log(`Найдено таблиц: ${existingTables.length}\n`);
    console.log('Существующие таблицы:');
    existingTables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });

    // Check for conflicts with new schema
    const newSchemaTables = [
      'users',
      'freelancer_profiles',
      'client_profiles',
      'skills',
      'user_skills',
      'jobs',
      'job_skills',
      'proposals',
      'contracts',
      'milestones',
      'transactions',
      'chats',
      'messages',
      'marketplace_items',
      'disputes',
      'notifications'
    ];

    console.log('\n⚠️  Конфликты с новой схемой:');
    const conflicts = [];
    newSchemaTables.forEach(table => {
      if (existingTables.includes(table)) {
        conflicts.push(table);
        console.log(`   ❌ ${table} - уже существует`);
      }
    });

    if (conflicts.length === 0) {
      console.log('   ✅ Конфликтов нет - можно применять новую схему');
    } else {
      console.log(`\n⚠️  Найдено ${conflicts.length} конфликтующих таблиц!`);
      console.log('   Нужно либо:');
      console.log('   1. Удалить старые таблицы (данные будут потеряны!)');
      console.log('   2. Создать скрипт миграции данных');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkExistingTables();

