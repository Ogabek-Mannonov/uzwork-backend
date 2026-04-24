
const pool = require("./src/db/pool");

async function check() {
  try {
    const res = await pool.query("SELECT id, type, metadata FROM messages WHERE type = 'submission' ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

check();
