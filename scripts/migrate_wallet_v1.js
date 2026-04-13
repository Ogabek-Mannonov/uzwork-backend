const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration for Wallet system...');
    
    await client.query('BEGIN');

    // 1. Transactions jadvalini kengaytirish
    console.log('Updating transactions table...');
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);

    // 2. User Cards jadvalini yaratish
    console.log('Creating user_cards table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        card_number VARCHAR(20) NOT NULL,
        card_holder VARCHAR(100) NOT NULL,
        expiry_date VARCHAR(10) NOT NULL,
        card_type VARCHAR(20) DEFAULT 'uzcard', -- uzcard, humo, visa, mastercard
        is_main BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index qo'shish
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_cards_user ON user_cards(user_id)');

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
