// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
<<<<<<< HEAD
  getUnreadProposalsCount
=======
  getSettings,
  updateSettings,
  getUnreadProposalsCount,
  markAllAsReadByType
>>>>>>> 50cfd563230cde0712e254426c4f8c3e9e2b4cad
} = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

// Protected routes
router.get('/me', authenticate, getMyNotifications);
router.get('/unread-proposals-count', authenticate, getUnreadProposalsCount);
router.post('/:id/mark-as-read', authenticate, markAsRead);
router.post('/mark-all-read', authenticate, markAllAsRead);

// Settings routes
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

// Count routes
router.get('/unread-proposals-count', authenticate, getUnreadProposalsCount);
router.post('/mark-all-read-by-type', authenticate, markAllAsReadByType);

module.exports = router;
