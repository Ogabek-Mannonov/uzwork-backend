const pool = require('../src/db/pool');

async function fixJobsConstraint() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log("Dropping existing jobs_status_check constraint...");
    await client.query(`
      ALTER TABLE jobs 
      DROP CONSTRAINT IF EXISTS jobs_status_check;
    `);
    
    console.log("Adding new jobs_status_check constraint with 'draft'...");
    await client.query(`
      ALTER TABLE jobs 
      ADD CONSTRAINT jobs_status_check 
      CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'draft'));
    `);
    
    await client.query('COMMIT');
    console.log("Successfully updated jobs status constraint!");
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating constraint:", error);
  } finally {
    client.release();
    pool.end();
  }
}

fixJobsConstraint();
