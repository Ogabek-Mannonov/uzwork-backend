// scripts/add_currency_column.js
const pool = require('../src/db/pool');

async function migrate() {
  try {
    console.log('Migrating jobs table to add currency column...');
    
    await pool.query(`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'UZS';
    `);
    
    console.log('Successfully checked/added currency column to jobs table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
