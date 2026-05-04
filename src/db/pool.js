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
      ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;
      ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      
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

      -- Messages jadvaliga metadata va submission turi uchun tayyorgarlik
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;
      
      -- Xabarlar turi uchun check constraintni tekshirish va yangilash (agar bo'lsa)
      -- Eslatma: PostgreSQLda constraintni o'zgartirish uchun uni o'chirib qayta qo'shish kerak
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_type_check') THEN
          ALTER TABLE messages DROP CONSTRAINT messages_type_check;
        END IF;
      END $$;

      ALTER TABLE messages ADD CONSTRAINT messages_type_check 
        CHECK (type IN ('text', 'image', 'file', 'voice', 'video_call', 'submission', 'system'));

      -- saved_items jadvalini yaratish
      CREATE TABLE IF NOT EXISTS saved_items (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type   VARCHAR(20) NOT NULL, -- 'freelancer', 'job', 'project'
        item_id     UUID        NOT NULL,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, item_type, item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_items_item ON saved_items(item_type, item_id);

      -- Balans ustunlarini kattalashtirish (katta summalar uchun)
      ALTER TABLE user_balances ALTER COLUMN available_balance TYPE DECIMAL(20, 2);
      ALTER TABLE user_balances ALTER COLUMN escrow_balance TYPE DECIMAL(20, 2);
      ALTER TABLE user_balances ALTER COLUMN total_earned TYPE DECIMAL(20, 2);
      ALTER TABLE user_balances ALTER COLUMN total_spent TYPE DECIMAL(20, 2);
      ALTER TABLE transactions ALTER COLUMN amount TYPE DECIMAL(20, 2);

      -- Currency check constraint yangilash (RUB qo'shish)
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS tx_currency_check;
      ALTER TABLE transactions ADD CONSTRAINT tx_currency_check 
        CHECK (currency IN ('UZS', 'USD', 'RUB'));

      -- Skills jadvalini yaratish
      CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      -- BUG FIX: Correct the inflated 6.3B UZS deposit to 500k UZS
      DO $$
      DECLARE
        bad_tx RECORD;
        diff DECIMAL;
      BEGIN
        FOR bad_tx IN SELECT * FROM transactions WHERE type = 'deposit' AND amount = 6300000000 LOOP
          diff := 6300000000 - 500000;
          
          -- Update transaction amount
          UPDATE transactions SET amount = 500000 WHERE id = bad_tx.id;
          
          -- Deduct difference from user balance
          UPDATE user_balances 
          SET available_balance = available_balance - diff
          WHERE user_id = bad_tx.user_id;
          
          RAISE NOTICE 'Fixed inflated deposit for user %', bad_tx.user_id;
        END LOOP;

        -- BUG FIX 2: Correct the inflated 6.3B UZS escrow_hold to 500k UZS
        FOR bad_tx IN SELECT * FROM transactions WHERE type = 'escrow_hold' AND amount = 6300000000 LOOP
          diff := 6300000000 - 500000;
          
          -- Update transaction amount
          UPDATE transactions SET amount = 500000 WHERE id = bad_tx.id;
          
          -- Fix balances (Move the excess back from escrow to available)
          UPDATE user_balances 
          SET available_balance = available_balance + diff,
              escrow_balance = escrow_balance - diff
          WHERE user_id = bad_tx.user_id;
          
          -- Update contract amount if linked
          IF bad_tx.contract_id IS NOT NULL THEN
            UPDATE contracts SET total_amount = 500000 WHERE id = bad_tx.contract_id;
            -- Update milestones
            UPDATE milestones SET amount = 500000 WHERE contract_id = bad_tx.contract_id;
          END IF;
          
          RAISE NOTICE 'Fixed inflated escrow_hold for user %', bad_tx.user_id;
        END LOOP;
      END $$;

      CREATE TABLE IF NOT EXISTS currency_rates (
        id SERIAL PRIMARY KEY,
        from_currency VARCHAR(10) NOT NULL,
        to_currency VARCHAR(10) NOT NULL,
        rate DECIMAL(18, 6) NOT NULL,
        source VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18, 6) DEFAULT 1;
      UPDATE contracts SET exchange_rate = 12200 WHERE exchange_rate = 1 OR exchange_rate IS NULL OR exchange_rate = 12700;

      -- Portfolio tables
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
      CREATE INDEX IF NOT EXISTS idx_portfolio_items_user ON portfolio_items(user_id);

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
      CREATE INDEX IF NOT EXISTS idx_portfolio_media_item ON portfolio_media(item_id);

      -- Certifications table
      CREATE TABLE IF NOT EXISTS freelancer_certifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        issuer VARCHAR(255),
        issue_year INT,
        issue_month INT,
        credential_id VARCHAR(255),
        credential_url TEXT,
        certificate_file_url TEXT,
        certificate_filename TEXT,
        certificate_mime VARCHAR(100),
        certificate_size_bytes BIGINT,
        file_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_freelancer_certifications_user ON freelancer_certifications(user_id);
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
