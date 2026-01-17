// src/server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const pool = require('./db/pool');

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

// HTTP server yaratish (Socket.io uchun kerak)
const server = http.createServer(app);

// Socket.io sozlamalari (real-time chat uchun)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://uzwork.uz"], // frontend URL lari
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.io ulanishlarini boshqarish
io.on('connection', (socket) => {
  console.log('Yangi foydalanuvchi ulandi:', socket.id);

  // Foydalanuvchi o‘z roomiga qo‘shiladi
  socket.on('joinUser', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} o‘z roomiga qo‘shildi`);
    }
  });

  // Suhbat roomiga qo‘shilish (chatId bo‘yicha)
  socket.on('joinChat', (chatId) => {
    if (chatId) {
      socket.join(`chat_${chatId}`);
      console.log(`Socket ${socket.id} chat_${chatId} roomiga qo‘shildi`);
    }
  });

  // Yangi xabar yuborish
  socket.on('sendMessage', (data) => {
    const { chatId, receiverId, message } = data;
    
    // Suhbatdagi barcha qatnashuvchilarga yuborish
    io.to(`chat_${chatId}`).emit('newMessage', message);
    
    // Yangi xabar bildirishnomasi (o‘qilmagan soni)
    io.to(`user_${receiverId}`).emit('unreadUpdate', {
      chatId,
      unreadCount: 1 // real sonini backenddan hisoblash mumkin
    });
  });

  // Xabar o‘qilganini bildirish
  socket.on('markAsRead', ({ chatId, userId }) => {
    io.to(`user_${userId}`).emit('messagesRead', { chatId });
  });

  // Online status
  socket.on('userOnline', (userId) => {
    io.emit('userStatus', { userId, online: true });
  });

  socket.on('disconnect', () => {
    console.log('Foydalanuvchi uzildi:', socket.id);
  });
});

// Middlewares
app.use(cors({
  origin: ["http://localhost:3000", "https://uzwork.uz"],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());

// Locale middleware (agar kerak bo‘lsa)
const localeMiddleware = require('./middlewares/localeMiddleware');
app.use(localeMiddleware);

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

// Serverni ishga tushirish (Socket.io bilan)
server.listen(PORT, () => {
  console.log(`UzWork server ${PORT} portda ishlayapti (Socket.io bilan) 🚀`);
});