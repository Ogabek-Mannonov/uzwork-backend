// scripts/create_portfolio_tables.js
// portfolio_items va portfolio_media jadvallarini yaratadi (agar yo'q bo'lsa)
require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL topilmadi (.env)");
  process.exit(1);
}

const isLocal =
  DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("🚀 Portfolio jadvallari tekshirilmoqda...\n");

    // 1. portfolio_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_items (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(255) NOT NULL,
        role        VARCHAR(255),
        description TEXT,
        project_url TEXT,
        skills      JSONB DEFAULT '[]',
        is_featured BOOLEAN DEFAULT false,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ portfolio_items jadvali mavjud (yoki yaratildi)");

    // 2. role ustuni mavjudligini tekshir (eski DBlar uchun)
    const roleCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'portfolio_items' AND column_name = 'role'
    `);
    if (roleCheck.rows.length === 0) {
      await client.query(
        `ALTER TABLE portfolio_items ADD COLUMN role VARCHAR(255);`
      );
      console.log("✅ portfolio_items.role ustuni qo'shildi");
    } else {
      console.log("ℹ️  portfolio_items.role ustuni allaqachon mavjud");
    }

    // 3. portfolio_media
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_media (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id     UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
        media_type  VARCHAR(20) DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document')),
        url         TEXT NOT NULL,
        filename    TEXT,
        mime        VARCHAR(100),
        size_bytes  BIGINT,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ portfolio_media jadvali mavjud (yoki yaratildi)");

    // 4. Indexlar
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_items_user ON portfolio_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_portfolio_media_item ON portfolio_media(item_id);
    `);
    console.log("✅ Indexlar yaratildi");

    console.log("\n🎉 Migration muvaffaqiyatli tugadi!");
  } catch (err) {
    console.error("❌ Migration xatosi:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
