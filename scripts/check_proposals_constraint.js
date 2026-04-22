const pool = require("../src/db/pool");

async function checkConstraints() {
  try {
    console.log("Checking proposals table status constraint...");
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'proposals'::regclass AND conname LIKE '%status%';
    `);
    console.log("Constraints found:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Failed to check constraints:", err);
    process.exit(1);
  }
}

checkConstraints();
