// src/db/pool.js
require("dotenv").config();
const { Pool, types } = require("pg");

// TIMESTAMP (OID 1114) va TIMESTAMPTZ (OID 1184) uchun UTC parsing
// "Nuclear" fix: vaqtni Date obyektiga aylantirmaslik, shunchaki string sifatida qaytarish
types.setTypeParser(1114, (val) => val);
types.setTypeParser(1184, (val) => val);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("❌ DATABASE_URL yo'q (.env)");

const isLocal =
  DATABASE_URL.includes("localhost") ||
  DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
});

pool.on("connect", async (client) => {
  client.query("SET timezone = 'UTC'");
  console.log(`✅ Postgres ulandi (${isLocal ? "LOCAL" : "REMOTE SSL"})`);
});

// Auto-migration: shortlisted status ruxsat berish va freelancer_id qo'shish
// Darhol ishga tushiramiz
(async () => {
  try {
    // Muammoli qatorlarni topib ko'ramiz
    const badRows = await pool.query(`
      SELECT id, status FROM proposals 
      WHERE status IS NOT NULL AND status NOT IN ('pending', 'shortlisted', 'accepted', 'rejected', 'interviewing', 'withdrawn')
    `);
    if (badRows.rows.length > 0) {
      console.log("⚠️ Quyidagi qatorlar yangi status chekloviga mos kelmaydi:", badRows.rows);
      
      // Avval ularni 'pending' ga qaytaramiz (migratsiya o'tib ketishi uchun)
      await pool.query(`
        UPDATE proposals 
        SET status = 'pending' 
        WHERE status NOT IN ('pending', 'shortlisted', 'accepted', 'rejected', 'interviewing', 'withdrawn')
      `);
      console.log("✅ Muammoli qatorlar 'pending' holatiga qaytarildi.");
    }

    await pool.query(`
      ALTER TABLE chats ADD COLUMN IF NOT EXISTS freelancer_id UUID REFERENCES users(id);
      
      -- Proposals jadvalidagi status checkni yangilash
      ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
      ALTER TABLE proposals ADD CONSTRAINT proposals_status_check 
        CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'interviewing', 'invited'));

      -- is_invitation kolonkasi qo'shish
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS is_invitation BOOLEAN DEFAULT FALSE;
      UPDATE proposals SET is_invitation = TRUE WHERE status = 'invited' AND is_invitation = FALSE;

      -- Xatolik bilan o'zgarib qolgan statusni qaytaramiz
      UPDATE proposals SET status = 'accepted' WHERE id = '336ea2db-76c1-4978-8ae1-7fb0b35f588e';

      -- Notifications jadvalini 3 ta tilga moslash
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS title_en TEXT,
      ADD COLUMN IF NOT EXISTS title_ru TEXT,
      ADD COLUMN IF NOT EXISTS body_en TEXT,
      ADD COLUMN IF NOT EXISTS body_ru TEXT;
    `);
    console.log("🚀 Database migratsiyasi muvaffaqiyatli yakunlandi.");
  } catch (e) {
    console.error("❌ Migratsiyada xato:", e.message);
  }
})();

pool.on("error", (err) => {
  console.error("❌ DB error:", err.message);
});

module.exports = pool;
