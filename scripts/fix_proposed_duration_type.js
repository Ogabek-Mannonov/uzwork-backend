const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Migrating proposed_duration to VARCHAR(50)...');
    await client.query('ALTER TABLE proposals ALTER COLUMN proposed_duration TYPE VARCHAR(50)');
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
