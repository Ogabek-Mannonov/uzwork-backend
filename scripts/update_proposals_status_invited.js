const pool = require("../src/db/pool");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Find the constraint name
    const findRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'proposals'::regclass AND conname LIKE '%status%';
    `);
    
    for (const row of findRes.rows) {
      console.log(`Dropping constraint: ${row.conname}`);
      await client.query(\`ALTER TABLE proposals DROP CONSTRAINT IF EXISTS "\${row.conname}"\`);
    }
    
    // Add the new one with 'invited' and 'consumed'
    console.log("Adding new status constraint...");
    await client.query(`
      ALTER TABLE proposals 
      ADD CONSTRAINT proposals_status_check 
      CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'consumed', 'invited'))
    `);
    
    await client.query("COMMIT");
    console.log("Migration successful!");
    process.exit(0);
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
}

migrate();
