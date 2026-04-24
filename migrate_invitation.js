const pool = require('./src/db/pool');

async function migrate() {
  try {
    console.log("Starting invitation migration...");
    await pool.query(`
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS is_invitation BOOLEAN DEFAULT FALSE;
      UPDATE proposals SET is_invitation = TRUE WHERE status = 'invited';
    `);
    console.log("Migration successful!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
