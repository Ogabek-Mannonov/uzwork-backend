// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const {
  isAdmin,
  getDashboardStats,
  getUsers,
  getJobs,
  getPayments,
  getChats,
  // qolgan funksiyalar keyin qo‘shiladi
} = require('../controllers/adminController');

// Barcha admin route lar authenticate va isAdmin dan o‘tadi
router.use(authenticate);
// router.use(isAdmin);

// Dashboard statistikasi
router.get('/dashboard', getDashboardStats);

// Foydalanuvchilar
router.get('/users', getUsers);

// Loyihalar
router.get('/jobs', getJobs);

// To‘lovlar
router.get('/payments', getPayments);

// Chatlar (so‘nggi chatlar ro‘yxati)
router.get('/chats', getChats);

// Keyinchalik qo‘shiladigan route lar (hozircha comment)
 // router.get('/disputes', getDisputes);
 // router.post('/disputes/:id/resolve', resolveDispute);
 // router.put('/users/:id/verify', verifyUser);

module.exports = router;