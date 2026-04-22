const pool = require("../src/db/pool");

async function checkBadRows() {
  try {
    console.log("Checking for rows with unexpected statuses...");
    const res = await pool.query(`
      SELECT id, status FROM proposals 
      WHERE status NOT IN ('pending', 'accepted', 'rejected');
    `);
    console.log("Rows with non-standard statuses:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Failed to check rows:", err);
    process.exit(1);
  }
}

checkBadRows();
