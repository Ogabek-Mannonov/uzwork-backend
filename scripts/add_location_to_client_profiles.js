// scripts/add_location_to_client_profiles.js
require("dotenv").config();
const pool = require("../src/db/pool");

async function addLocationColumn() {
  const client = await pool.connect();
  try {
    console.log("🔧 client_profiles jadvaliga 'location' ustunini qo'shish...");

    // Check if column exists first
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='client_profiles' AND column_name='location';
    `);

    if (checkColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE client_profiles ADD COLUMN location VARCHAR(255);
      `);
      console.log("✅ 'location' ustuni qo'shildi!");
    } else {
      console.log("ℹ️ 'location' ustuni allaqachon mavjud.");
    }

  } catch (err) {
    console.error("❌ Xato:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addLocationColumn();
