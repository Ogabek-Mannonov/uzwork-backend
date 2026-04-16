// src/db/pool.js
require("dotenv").config();
const { Pool, types } = require("pg");

// TIMESTAMP (OID 1114) va TIMESTAMPTZ (OID 1184) uchun UTC parsing
// "Nuclear" fix: vaqtni Date obyektiga aylantirmaslik, shunchaki string sifatida qaytarish
types.setTypeParser(1114, (val) => val);
types.setTypeParser(1184, (val) => val);

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

pool.on("connect", (client) => {
  client.query("SET timezone = 'UTC'");
  console.log(`✅ Postgres ulandi (${isLocal ? "LOCAL" : "REMOTE SSL"})`);
});

pool.on("error", (err) => {
  console.error("❌ DB error:", err.message);
});

module.exports = pool;
