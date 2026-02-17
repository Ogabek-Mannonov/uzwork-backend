// src/db/pool.js
require("dotenv").config();
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("❌ DATABASE_URL yo'q (.env)");

const isLocal =
  DATABASE_URL.includes("localhost") ||
  DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
});

pool.on("connect", () => {
  console.log(`✅ Postgres ulandi (${isLocal ? "LOCAL" : "REMOTE SSL"})`);
});

pool.on("error", (err) => {
  console.error("❌ DB error:", err.message);
});

module.exports = pool;
