// src/db/pool.js
require("dotenv").config();
const { Pool } = require("pg");

const isProd = process.env.NODE_ENV === "production";

// Render / Neon / Supabase: ko‘pincha SSL kerak bo‘ladi.
// Local: SSL kerak emas.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("connect", () => {
  console.log("✅ Postgres ulandi");
});

pool.on("error", (err) => {
  console.error("❌ DB error:", err.message);
});

module.exports = pool;
