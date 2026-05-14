/**
 * Migration: KYC ustunlari va jadvalini qo'shish
 * Run: node scripts/add_kyc_columns.js
 */
const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. users jadvaliga KYC ustunlari qo'shish
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS kyc_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS kyc_reject_reason TEXT;
    `);

    // 2. kyc_submissions jadvali (hujjat tarixini saqlash)
    await client.query(`
      CREATE TABLE IF NOT EXISTS kyc_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        document_type VARCHAR(50) NOT NULL,
        document_front_url TEXT NOT NULL,
        document_back_url TEXT,
        selfie_url TEXT,
        full_name VARCHAR(200),
        date_of_birth DATE,
        document_number VARCHAR(100),
        country VARCHAR(100),
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reject_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON kyc_submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON kyc_submissions(status);
    `);

    await client.query('COMMIT');
    console.log('✅ KYC migration muvaffaqiyatli yakunlandi!');
    console.log('   - users.is_kyc_verified qo\'shildi');
    console.log('   - users.kyc_status qo\'shildi');
    console.log('   - kyc_submissions jadvali yaratildi');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration xato:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
