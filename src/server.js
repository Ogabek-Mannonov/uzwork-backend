// src/server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
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
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// HTTP server yaratish (Socket.io uchun kerak)
const server = http.createServer(app);

// Socket.io sozlamalari (real-time chat uchun)
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173", // Vite default port
      "https://uzwork.uz",
      "https://uzwork-admin-panel.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.io ni app ga qo'shish (routelardan foydalanish uchun)
app.set('io', io);

// Socket.io ulanishlarini boshqarish
io.on('connection', (socket) => {
  console.log('✅ Yangi foydalanuvchi ulandi:', socket.id);

  // Foydalanuvchi o'z roomiga qo'shiladi
  socket.on('joinUser', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} o'z roomiga qo'shildi`);
    }
  });

  // Suhbat roomiga qo'shilish (chatId bo'yicha)
  socket.on('joinChat', (chatId) => {
    if (chatId) {
      socket.join(chatId); // chat_ prefixi siz
      console.log(`💬 Socket ${socket.id} ${chatId} roomiga qo'shildi`);
    }
  });

  // Yangi xabar yuborish
  socket.on('sendMessage', (data) => {
    const { chatId, receiverId, message } = data;
    
    // Suhbatdagi barcha qatnashuvchilarga yuborish
    io.to(chatId).emit('newMessage', message);
    
    // Yangi xabar bildirishnomasi (o'qilmagan soni)
    if (receiverId) {
      io.to(`user_${receiverId}`).emit('unreadUpdate', {
        chatId,
        unreadCount: 1
      });
    }
  });

  // Xabar o'qilganini bildirish
  socket.on('markAsRead', ({ chatId, userId }) => {
    if (userId) {
      io.to(`user_${userId}`).emit('messagesRead', { chatId });
    }
  });

  // Online status
  socket.on('userOnline', (userId) => {
    io.emit('userStatus', { userId, online: true });
  });

  // Typing indicator
  socket.on('typing', ({ chatId, userId, username }) => {
    socket.to(chatId).emit('userTyping', { userId, username });
  });

  socket.on('stopTyping', ({ chatId }) => {
    socket.to(chatId).emit('userStoppedTyping');
  });

  socket.on('disconnect', () => {
    console.log('❌ Foydalanuvchi uzildi:', socket.id);
  });
});

// Middlewares
app.use(cors({
  origin: [
    'https://uzwork-admin-panel.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://uzwork.uz'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' })); // File upload uchun kattaroq limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Helmet - security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Static files uchun
}));

// Locale middleware (agar kerak bo'lsa)
const localeMiddleware = require('./middlewares/localeMiddleware');
app.use(localeMiddleware);

// Static files - MUHIM! (uploads papkasi)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Test route
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'UzWork backend ishlayapti! 🇺🇿🚀',
      version: '1.0.0',
      database_time: result.rows[0].now,
      features: {
        socketIO: true,
        fileUpload: true,
        voiceMessages: true
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Database ulanishda xato',
      error: err.message
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
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
app.use('/upload', uploadRoutes); // Voice upload route

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route topilmadi: ${req.method} ${req.url}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Fayl hajmi juda katta (max 10MB)'
    });
  }
  
  if (err.message === 'Faqat audio fayllar ruxsat etilgan') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server xatosi',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    pool.end(() => {
      console.log('✅ Database pool closed');
      process.exit(0);
    });
  });
});

// Serverni ishga tushirish (Socket.io bilan)
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 UzWork Server ishga tushdi!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`💬 Socket.io: Enabled`);
  console.log(`📁 Uploads: /uploads`);
  console.log(`🎤 Voice Messages: Enabled`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});