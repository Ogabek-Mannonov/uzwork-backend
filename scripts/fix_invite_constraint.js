const pool = require("../src/db/pool");

async function fixConstraint() {
  const client = await pool.connect();
  try {
    console.log("Starting manual constraint fix...");
    await client.query("BEGIN");
    
    // Drop existing constraint
    await client.query("ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;");
    
    // Add new constraint with all required statuses
    await client.query(`
      ALTER TABLE proposals 
      ADD CONSTRAINT proposals_status_check 
      CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'interviewing', 'invited'));
    `);
    
    await client.query("COMMIT");
    console.log("✅ Successfully updated proposals_status_check constraint!");
    process.exit(0);
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("❌ Failed to update constraint:", err);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
}

fixConstraint();
