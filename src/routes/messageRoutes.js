// src/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const {
  getChats,
  getChatHistory,
  sendMessage,
  sendVoiceMessage,
  startVideoCall
} = require('../controllers/messageController');
const { authenticate } = require('../middlewares/authMiddleware');

// All routes require authentication
router.get('/', authenticate, getChats);
router.get('/:chatId', authenticate, getChatHistory);
router.post('/', authenticate, sendMessage);
router.post('/:chatId/voice', authenticate, sendVoiceMessage);
router.post('/:chatId/video-call', authenticate, startVideoCall);

module.exports = router;


