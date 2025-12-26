// src/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  getUserProfile,
  updateMyProfile
} = require('../controllers/profileController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public routes
router.get('/:userId', getUserProfile);

// Protected routes
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);

module.exports = router;


