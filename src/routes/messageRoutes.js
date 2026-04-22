// src/routes/messageRoutes.js
const express = require("express");
const router = express.Router();

const {
  getChats,
  getChatHistory,
  getUnreadCount,
  sendMessage,
  sendVoiceMessage,
  startVideoCall,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  updateChatStatus,
  findOrCreateChat,
} = require("../controllers/messageController");

const { authenticate, authorize } = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Unread count
router.get("/unread/count", getUnreadCount);

// Chats list
router.get("/", getChats);

// Chat history
router.get("/:chatId", getChatHistory);

// Find or create chat by proposal
router.post("/find-or-create/:proposalId", findOrCreateChat);

// Send message
router.post("/", sendMessage);

// Mark read
router.put("/read/:chatId", markMessagesAsRead);

// Voice & Video
router.post("/:chatId/voice", sendVoiceMessage);
router.post("/:chatId/video-call", startVideoCall);

// Edit / Delete message
router.put("/:messageId", editMessage);
router.delete("/:messageId", deleteMessage);

// Admin: update chat status (block/unblock)
router.patch("/chats/:id/status", authorize("admin"), authenticate, updateChatStatus);


module.exports = router;
