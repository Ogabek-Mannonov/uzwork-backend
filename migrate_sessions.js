const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const pool = require("./src/db/pool");

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting migration: Adding columns to refresh_tokens...");
    
    await client.query(`
      ALTER TABLE refresh_tokens 
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
      ADD COLUMN IF NOT EXISTS user_agent TEXT,
      ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
