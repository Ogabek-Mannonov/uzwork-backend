// src/db/pool.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.on('connect', () => {
  console.log('Database ga ulanish muvaffaqiyatli! 🇺🇿');
});

pool.on('error', (err) => {
  console.error('Database xatosi:', err.message);
});

module.exports = pool;