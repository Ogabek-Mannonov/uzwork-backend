// scripts/create_saved_jobs_table.js
require("dotenv").config();
const pool = require("../src/db/pool");

async function createSavedJobsTable() {
  const client = await pool.connect();
  try {
    console.log("🔧 saved_jobs jadvalini yaratish...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, job_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs(job_id);
    `);

    console.log("✅ saved_jobs jadvali tayyor!");
  } catch (err) {
    console.error("❌ Xato:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createSavedJobsTable();
