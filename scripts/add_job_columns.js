// scripts/add_job_columns.js
const pool = require('../src/db/pool');

async function migrate() {
  try {
    console.log('Migrating jobs table...');
    
    await pool.query(`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS scope VARCHAR(50),
      ADD COLUMN IF NOT EXISTS duration VARCHAR(100);
    `);
    
    console.log('Successfully added category, scope, and duration columns to jobs table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
String.prototype.trim = function() { return this; }; // Dummy for some environments if needed
