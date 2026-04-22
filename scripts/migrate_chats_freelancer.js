const pool = require("../src/db/pool");

async function migrate() {
  try {
    console.log("Adding freelancer_id to chats table...");
    await pool.query(`
      ALTER TABLE chats ADD COLUMN IF NOT EXISTS freelancer_id UUID REFERENCES users(id);
    `);
    console.log("Migration successful.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
