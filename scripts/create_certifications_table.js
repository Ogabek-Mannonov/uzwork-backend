// scripts/create_certifications_table.js
// Bu scriptni bir marta ishga tushurib, freelancer_certifications jadvalini yarating:
// node scripts/create_certifications_table.js

require("dotenv").config();
const pool = require("../src/db/pool");

async function createCertificationsTable() {
  const client = await pool.connect();
  try {
    console.log("🔧 freelancer_certifications jadvalini tekshirish/yaratish...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS freelancer_certifications (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title           VARCHAR(255) NOT NULL,
        issuer          VARCHAR(255),
        issue_year      INT,
        issue_month     INT CHECK (issue_month BETWEEN 1 AND 12),
        credential_id   VARCHAR(255),
        credential_url  TEXT,
        certificate_file_url    TEXT,
        certificate_filename    VARCHAR(255),
        certificate_mime        VARCHAR(100),
        certificate_size_bytes  BIGINT,
        file_updated_at TIMESTAMP,
        created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP   NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_freelancer_certifications_user_id
        ON freelancer_certifications(user_id);
    `);

    console.log("✅ freelancer_certifications jadval tayyor!");
  } catch (err) {
    console.error("❌ Xato:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createCertificationsTable();
