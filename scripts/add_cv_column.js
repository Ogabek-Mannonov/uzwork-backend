// scripts/add_cv_column.js
require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL topilmadi (.env)");
  process.exit(1);
}

const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function migrate() {
  try {
    console.log("🚀 Alteraing freelancer_profiles table to add cv_url...");
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='freelancer_profiles' AND column_name='cv_url'
    `);

    if (checkRes.rows.length === 0) {
      await pool.query(`ALTER TABLE freelancer_profiles ADD COLUMN cv_url TEXT;`);
      console.log("✅ cv_url ustuni muvaffaqiyatli qo'shildi!");
    } else {
      console.log("ℹ️ cv_url ustuni allaqachon mavjud.");
    }
  } catch (err) {
    console.error("❌ Xatolik yuz berdi:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
