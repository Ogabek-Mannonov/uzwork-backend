// src/server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./db/pool');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());

// Routes
app.use('/auth', authRoutes); // <--- YANGI QO‘SHILDI

// Test route
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: 'UzWork backend ishlayapti! 🇺🇿🚀',
      database_time: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      message: 'Database ulanishda xato',
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portda ishlayapti`);
});