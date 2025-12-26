// scripts/check-users-columns.js
require('dotenv').config();
const pool = require('../src/db/pool');

async function checkUsersColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📋 Колонки в таблице users:\n');
    result.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check for missing/extra fields
    const existingColumns = result.rows.map(r => r.column_name);
    const requiredFields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'password_hash', 'role', 'is_verified', 'balance_uzs', 'balance_usd'];
    const controllerFields = ['sms_verification_code', 'sms_code_expires_at', 'is_email_verified', 'is_phone_verified', 'is_kyc_verified', 'kyc_status', 'passport_number', 'passport_image_url', 'refresh_token'];

    console.log('\n✅ Обязательные поля новой схемы:');
    requiredFields.forEach(field => {
      const exists = existingColumns.includes(field);
      console.log(`   ${exists ? '✅' : '❌'} ${field}`);
    });

    console.log('\n⚠️  Поля, используемые в контроллере, но отсутствующие в новой схеме:');
    controllerFields.forEach(field => {
      const exists = existingColumns.includes(field);
      console.log(`   ${exists ? '✅' : '❌'} ${field} ${exists ? '(есть в БД)' : '(НЕТ в новой схеме!)'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkUsersColumns();

