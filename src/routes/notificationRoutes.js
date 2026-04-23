// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getSettings,
  updateSettings,
  getUnreadProposalsCount,
  markAllAsReadByType
} = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

// Protected routes
router.get('/me', authenticate, getMyNotifications);
router.post('/:id/mark-as-read', authenticate, markAsRead);
router.post('/mark-all-read', authenticate, markAllAsRead);

// Settings routes
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

// Count routes
router.get('/unread-proposals-count', authenticate, getUnreadProposalsCount);
router.post('/mark-all-read-by-type', authenticate, markAllAsReadByType);

module.exports = router;

