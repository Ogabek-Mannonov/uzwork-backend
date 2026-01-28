const express = require('express');
const router = express.Router();
const {
  getChats,
  getChatHistory,
  sendMessage,
  sendVoiceMessage,
  startVideoCall,
  markMessagesAsRead,
  editMessage,      
  deleteMessage,  
  updateChatStatus  
} = require('../controllers/messageController');
const { authenticate } = require('../middlewares/authMiddleware');

// All routes require authentication
router.get('/', authenticate, getChats);
router.get('/:chatId', authenticate, getChatHistory);
router.post('/', authenticate, sendMessage);
router.put('/read/:chatId', authenticate, markMessagesAsRead);
router.post('/:chatId/voice', authenticate, sendVoiceMessage);
router.post('/:chatId/video-call', authenticate, startVideoCall);

// Edit va Delete
router.put('/:messageId', authenticate, editMessage);       
router.delete('/:messageId', authenticate, deleteMessage);  

router.patch('/chats/:id/status', updateChatStatus);

module.exports = router;