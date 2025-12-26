// src/server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./db/pool.js');

// Import routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const contractRoutes = require('./routes/contractRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const profileRoutes = require('./routes/profileRoutes');
const freelancerRoutes = require('./routes/freelancerRoutes');
const clientRoutes = require('./routes/clientRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const supportRoutes = require('./routes/supportRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());
const localeMiddleware = require('./middlewares/localeMiddleware');
app.use(localeMiddleware);

// Test route – database ulanishini tekshirish
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

// API Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/proposals', proposalRoutes);
app.use('/contracts', contractRoutes);
app.use('/reviews', reviewRoutes);
app.use('/profiles', profileRoutes);
app.use('/freelancers', freelancerRoutes);
app.use('/clients', clientRoutes);
app.use('/search', searchRoutes);
app.use('/notifications', notificationRoutes);
app.use('/messages', messageRoutes);
app.use('/payments', paymentRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/admin', adminRoutes);
app.use('/ai', aiRoutes);
app.use('/support', supportRoutes);
app.use('/currencies', currencyRoutes);
app.use('/files', fileRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route topilmadi.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server xatosi',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portda ishlayapti`);
});