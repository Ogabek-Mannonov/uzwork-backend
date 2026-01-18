// src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();

// Import qilish
const { upload, uploadVoice } = require('../controllers/uploadController');
const { authenticate } = require('../middlewares/authMiddleware'); // ✅ TO'G'RI

// Debug uchun
console.log('📦 uploadRoutes - upload:', typeof upload);
console.log('📦 uploadRoutes - uploadVoice:', typeof uploadVoice);
console.log('📦 uploadRoutes - authenticate:', typeof authenticate);

// Route - authenticate bilan
router.post('/voice', authenticate, upload.single('voice'), uploadVoice);

console.log('✅ Upload routes loaded');

module.exports = router;