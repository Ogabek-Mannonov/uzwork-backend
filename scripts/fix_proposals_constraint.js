// scripts/fix_proposals_constraint.js
const pool = require('../src/db/pool');

async function migrate() {
  try {
    console.log('Updating proposals table check constraint...');
    
    // Using a single query block to ensure atomicity
    await pool.query(`
      ALTER TABLE proposals 
      DROP CONSTRAINT IF EXISTS proposals_status_check;
      
      ALTER TABLE proposals 
      ADD CONSTRAINT proposals_status_check 
      CHECK (status IN ('pending', 'accepted', 'rejected', 'invited', 'withdrawn'));
    `);
    
    console.log('Successfully updated proposals status constraint to include "invited" and "withdrawn".');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
