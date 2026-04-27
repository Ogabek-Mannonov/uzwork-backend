// scripts/create_saved_items_table.js
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createSavedItemsTable() {
  const client = await pool.connect();
  try {
    console.log("🔧 saved_items jadvalini yaratish...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_items (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type   VARCHAR(20) NOT NULL, -- 'freelancer', 'job', 'project'
        item_id     UUID        NOT NULL,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, item_type, item_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_items_item ON saved_items(item_type, item_id);
    `);

    console.log("✅ saved_items jadvali tayyor!");
  } catch (err) {
    console.error("❌ Xato:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createSavedItemsTable();
