// src/db/pool.js
require('dotenv').config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,  // 15 sekund (Render-ga vaqt berish)
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // Yangi sozlamalar
  statement_timeout: 30000,  // Query timeout
  query_timeout: 30000,
});

pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

pool.on("connect", () => {
  console.log("✓ Database connected successfully");
});

// Connection test
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection test failed:", err);
  } else {
    console.log("✓ Database test query successful:", res.rows[0]);
  }
});

module.exports = pool;