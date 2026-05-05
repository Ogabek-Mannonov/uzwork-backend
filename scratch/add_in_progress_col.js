const pool = require('../src/db/pool');

async function run() {
  try {
    console.log("Adding in_progress_jobs column to freelancer_profiles...");
    await pool.query(`ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS in_progress_jobs INT DEFAULT 0`);
    
    console.log("Syncing existing active contract counts...");
    await pool.query(`
      UPDATE freelancer_profiles fp
      SET in_progress_jobs = (
        SELECT COUNT(*)::int FROM contracts c
        WHERE c.freelancer_id = fp.user_id AND c.status = 'active'
      )
    `);
    
    console.log("Success: Column added and data synced.");
  } catch (error) {
    console.error("Error updating schema:", error);
  } finally {
    process.exit();
  }
}

run();
