const pool = require('../src/db/pool');

async function run() {
  try {
    // 1. Check constraints on transactions table
    const constraints = await pool.query(`
      SELECT 
        conname, 
        pg_get_constraintdef(c.oid) as condef
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.conrelid = 'transactions'::regclass;
    `);
    console.log("CONSTRAINTS:");
    constraints.rows.forEach(r => {
      console.log(`- ${r.conname}: ${r.condef}`);
    });

    // 2. Try to simulate a transaction insert with 'escrow_refund' to see if it violates a check constraint
    console.log("\nTesting simulation of insert 'escrow_refund'...");
    try {
      await pool.query("BEGIN");
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata)
        VALUES ('00000000-0000-0000-0000-000000000000', 'escrow_refund', 1000, 'UZS', 'internal', 'completed', '{}')
      `);
      console.log("Success: 'escrow_refund' is allowed!");
      await pool.query("ROLLBACK");
    } catch (err) {
      console.log("Failed insertion simulation of 'escrow_refund':", err.message);
      await pool.query("ROLLBACK");
    }

    // 3. Try to query a specific dispute to see if there is any other error (e.g. relation "jobs" or similar)
    console.log("\nTesting dispute query...");
    const dId = '0ef3e0bd-e398-4267-8e5c-0d191fbbeda1';
    try {
      const dRes = await pool.query(
        \`SELECT d.id, d.status, d.amount, d.currency, d.contract_id, ch.contract_id AS chat_contract_id,
                c.client_id, c.freelancer_id, c.currency AS contract_currency, c.exchange_rate,
                j.title AS job_title, j.id AS job_id, d.raised_by, d.against_user
         FROM disputes d
         LEFT JOIN chats ch ON ch.id = d.chat_id
         LEFT JOIN contracts c ON c.id = COALESCE(d.contract_id, ch.contract_id)
         LEFT JOIN jobs j ON j.id = c.job_id
         WHERE d.id = $1\`,
        [dId]
      );
      console.log("Dispute query success, rowCount:", dRes.rowCount);
      if (dRes.rowCount > 0) {
        console.log("Dispute data:", dRes.rows[0]);
      }
    } catch (err) {
      console.log("Dispute query failed:", err.message);
    }

  } catch (err) {
    console.error("General error:", err);
  } finally {
    await pool.end();
  }
}

run();
