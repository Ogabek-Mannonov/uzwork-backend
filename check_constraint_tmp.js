const pool = require("./src/db/pool");

async function checkConstraint() {
  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'proposals'::regclass AND conname LIKE '%status%';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkConstraint();
