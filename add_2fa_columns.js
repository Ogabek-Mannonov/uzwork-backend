require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const pool = require("./src/db/pool");

async function migrate() {
  try {
    console.log("Checking for 2FA columns...");
    
    // Add two_factor_enabled
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE
    `);
    
    // Add two_factor_code_hash
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS two_factor_code_hash TEXT
    `);
    
    // Add two_factor_expires_at
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS two_factor_expires_at TIMESTAMP
    `);

    console.log("✅ 2FA columns added successfully (if they didn't exist).");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err.message);
    process.exit(1);
  }
}

migrate();
