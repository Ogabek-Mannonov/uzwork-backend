require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // LOCALDA SSL KERAK EMAS
});

pool.on("connect", () => {
  console.log("✅ Local Postgres ulandi");
});

pool.on("error", (err) => {
  console.error("❌ Local DB error:", err.message);
});

// Local test
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Local DB test OK:", res.rows[0].now);
  } catch (e) {
    console.error("❌ Local DB test FAILED:", e.message);
  }
})();

module.exports = pool;
