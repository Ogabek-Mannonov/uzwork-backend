// src/controllers/uploadController.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("⚠️ sharp kutubxonasi o'rnatilmagan, rasmlarni optimallashtirish amalga oshirilmaydi.");
}

// Render/Production uchun: project rootdan ishlash yaxshiroq
const voiceDir = path.join(process.cwd(), "uploads", "voice");
const docsDir = path.join(process.cwd(), "uploads", "documents");
const imagesDir = path.join(process.cwd(), "uploads", "images");
const videosDir = path.join(process.cwd(), "uploads", "videos");

// Papkalarni yaratish
[voiceDir, docsDir, imagesDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Allowed formats
const ALLOWED_AUDIO_EXT = new Set([".webm", ".ogg", ".mp3", ".wav", ".m4a"]);
const ALLOWED_DOC_EXT = new Set([".pdf", ".doc", ".docx"]);
const ALLOWED_IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const ALLOWED_VIDEO_EXT = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_DOC_EXT.has(ext)) return cb(null, docsDir);
    if (ALLOWED_IMG_EXT.has(ext)) return cb(null, imagesDir);
    if (ALLOWED_VIDEO_EXT.has(ext)) return cb(null, videosDir);
    cb(null, voiceDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let prefix = "voice";
    if (ALLOWED_DOC_EXT.has(ext)) prefix = "doc";
    if (ALLOWED_IMG_EXT.has(ext)) prefix = "img";
    if (ALLOWED_VIDEO_EXT.has(ext)) prefix = "vid";
    const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = (file.mimetype || "").toLowerCase();

  const isAudio = ALLOWED_AUDIO_EXT.has(ext) || mimetype.startsWith("audio/");
  const isDoc = ALLOWED_DOC_EXT.has(ext) || 
                ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mimetype);
  const isImg = ALLOWED_IMG_EXT.has(ext) || mimetype.startsWith("image/");
  const isVideo = ALLOWED_VIDEO_EXT.has(ext) || mimetype.startsWith("video/");

  if (isAudio || isDoc || isImg || isVideo) return cb(null, true);

  return cb(new Error("Faqat audio, video, hujjat yoki rasm fayllar ruxsat."));
}

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter,
});

// Helper: BASE_URL bo‘lmasa req’dan yasab beradi (proxy’ni ham hisobga oladi)
function getBaseUrl(req) {
  const envBase = process.env.BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");

  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").toString().split(",")[0].trim();
  const host = req.get("host");
  return `${proto}://${host}`;
}

// Controller
const uploadGeneralFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Fayl yuklanmadi." });
    }

    const baseUrl = getBaseUrl(req);
    const ext = path.extname(req.file.filename).toLowerCase();
    
    let subDir = "voice";
    if (ALLOWED_DOC_EXT.has(ext) || req.file.filename.startsWith("doc-")) {
      subDir = "documents";
    } else if (ALLOWED_IMG_EXT.has(ext) || req.file.filename.startsWith("img-")) {
      subDir = "images";
    } else if (ALLOWED_VIDEO_EXT.has(ext) || req.file.filename.startsWith("vid-")) {
      subDir = "videos";
    }
    
    const fileUrl = `${baseUrl}/uploads/${subDir}/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: "Fayl muvaffaqiyatli yuklandi",
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Fayl yuklashda xato",
      error: error.message,
    });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Rasm yuklanmadi." });
    }

    const type = req.body.type || "general"; 
    const baseUrl = getBaseUrl(req);
    const originalPath = req.file.path;
    const ext = path.extname(req.file.filename).toLowerCase();
    const fileName = req.file.filename;
    
    if (sharp && (type === "avatar" || type === "cover")) {
      const processedName = `processed-${Date.now()}${ext}`;
      const processedPath = path.join(imagesDir, processedName);
      
      let transform = sharp(originalPath);
      
      if (type === "avatar") {
        transform = transform.resize(400, 400, { fit: "cover" });
      } else if (type === "cover") {
        transform = transform.resize(1200, 400, { fit: "cover" });
      }
      
      await transform.toFile(processedPath);
      try { fs.unlinkSync(originalPath); } catch(e) {}
      
      const fileUrl = `${baseUrl}/uploads/images/${processedName}`;
      return res.status(201).json({
        success: true,
        message: "Rasm optimallashtirib yuklandi",
        data: { url: fileUrl, filename: processedName }
      });
    }

    const fileUrl = `${baseUrl}/uploads/images/${fileName}`;
    return res.status(201).json({
      success: true,
      message: "Rasm yuklandi",
      data: { url: fileUrl, filename: fileName }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Rasm yuklashda xato",
      error: error.message,
    });
  }
};

const uploadVoice = uploadGeneralFile;

module.exports = {
  upload,
  uploadVoice,
  uploadGeneralFile,
  uploadImage,
};
