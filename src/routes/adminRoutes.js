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
  getJobById,
  getUserById,
  updateUserByAdmin,
  updateUserStatusByAdmin,
} = require('../controllers/adminController');

// Barcha admin route lar authenticate va isAdmin dan o‘tadi
router.use(authenticate);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUserByAdmin);
router.patch('/users/:id/status', updateUserStatusByAdmin);

// Jobs
router.get('/jobs', getJobs);
router.get('/jobs/:id', getJobById);

// Payments
router.get('/payments', getPayments);

// Chats
router.get('/chats', getChats);

module.exports = router;
