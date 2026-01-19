// src/controllers/uploadController.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Uploads papkasini yaratish (Render’da ham ishlaydi)
const uploadDir = path.join(__dirname, '../../uploads/voice');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ uploads/voice papkasi yaratildi');
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm'; // ext bo‘lmasa webm qo‘sh
    const uniqueName = `voice-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /webm|ogg|mp3|wav|m4a/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.includes('audio') || file.mimetype.includes('webm');

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Faqat audio fayllar ruxsat etilgan (webm, ogg, mp3, wav, m4a)'));
  }
};

// Multer configuration
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// Upload voice message handler
const uploadVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Fayl yuklanmadi'
      });
    }

    // **Production uchun to‘g‘ri HTTPS URL** (Render’da doim HTTPS)
    const baseUrl = process.env.BASE_URL || 'https://uzwork-backend.onrender.com';
    const fileUrl = `${baseUrl}/uploads/voice/${req.file.filename}`;

    console.log('✅ Voice file uploaded:', {
      filename: req.file.filename,
      size: req.file.size,
      fullUrl: fileUrl,
      path: req.file.path
    });

    res.json({
      success: true,
      message: 'Ovozli fayl yuklandi',
      data: {
        url: fileUrl, // Frontend bu URL ni ishlatadi
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('❌ Voice upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Fayl yuklashda xato',
      error: error.message
    });
  }
};

module.exports = { 
  upload,
  uploadVoice 
};