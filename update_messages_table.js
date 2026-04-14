const pool = require("./src/db/pool");

async function updateTable() {
  try {
    console.log("🐘 Messages jadvalini tekshirilmoqda...");
    
    // 1. reply_to_id ustunini qo'shish
    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
    `);
    console.log("✅ reply_to_id ustuni bor/qo'shildi.");

    // 2. reactions ustunini qo'shish
    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]';
    `);
    console.log("✅ reactions ustuni bor/qo'shildi.");

    console.log("🎉 Baza muvaffaqiyatli yangilandi!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Xatolik:", err.message);
    process.exit(1);
  }
}

updateTable();
