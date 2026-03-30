require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Testing profile query...");
    const profileRes = await pool.query(`
      SELECT
        user_id, title, bio, hourly_rate, location,
        languages, skills, portfolio_urls,
        rating, completed_jobs,
        avatar_url, cover_url, availability_status,
        created_at, updated_at
      FROM freelancer_profiles
      LIMIT 1
    `);
    console.log("Profile query OK:", profileRes.rows);
  } catch (err) {
    console.error("Profile query ERROR:", err.message);
  }

  try {
    console.log("Testing portfolio query...");
    const portRes = await pool.query(`
      SELECT id, user_id, title, description, project_url, skills, is_featured, created_at, updated_at
      FROM portfolio_items
      LIMIT 1
    `);
    console.log("Portfolio query OK:", portRes.rows);
  } catch (err) {
    console.error("Portfolio query ERROR:", err.message);
  }

  process.exit();
}
run();
