// src/db/pool.js
require('dotenv').config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Render’da uzilishlarni kamaytiradi
  max: 10,                 // bir vaqtning o'zida max connection
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

module.exports = pool;
