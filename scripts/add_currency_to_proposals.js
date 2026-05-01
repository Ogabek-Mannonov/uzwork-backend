// scripts/add_currency_to_proposals.js
const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding currency column to proposals table...');
    await client.query(`
      ALTER TABLE proposals 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
    `);
    console.log('Success: currency column added.');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
