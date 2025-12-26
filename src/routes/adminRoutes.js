// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const {
  isAdmin,
  getUsers,
  verifyUser,
  getJobs,
  getDisputes,
  resolveDispute,
  getAnalytics
} = require('../controllers/adminController');
const { authenticate } = require('../middlewares/authMiddleware');

// All admin routes require authentication and admin check
router.use(authenticate);
router.use(isAdmin);

router.get('/users', getUsers);
router.put('/users/:id/verify', verifyUser);
router.get('/jobs', getJobs);
router.get('/disputes', getDisputes);
router.post('/disputes/:id/resolve', resolveDispute);
router.get('/analytics', getAnalytics);

module.exports = router;

