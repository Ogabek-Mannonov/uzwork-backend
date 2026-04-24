// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadProposalsCount
} = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

// Protected routes
router.get('/me', authenticate, getMyNotifications);
router.get('/unread-proposals-count', authenticate, getUnreadProposalsCount);
router.post('/:id/mark-as-read', authenticate, markAsRead);
router.post('/mark-all-read', authenticate, markAllAsRead);

module.exports = router;
