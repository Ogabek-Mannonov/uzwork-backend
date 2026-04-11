// scripts/add_portfolio_role.js
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
    console.log("🚀 Altering portfolio_items table to add role column...");
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='portfolio_items' AND column_name='role'
    `);

    if (checkRes.rows.length === 0) {
      await pool.query(`ALTER TABLE portfolio_items ADD COLUMN role VARCHAR(255);`);
      console.log("✅ 'role' ustuni muvaffaqiyatli qo'shildi!");
    } else {
      console.log("ℹ️ 'role' ustuni allaqachon mavjud.");
    }
  } catch (err) {
    console.error("❌ Xatolik yuz berdi:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
