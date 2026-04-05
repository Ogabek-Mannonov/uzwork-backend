// src/controllers/uploadController.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Render/Production uchun: project rootdan ishlash yaxshiroq
// Updated to support documents (CV/Resume)
const voiceDir = path.join(process.cwd(), "uploads", "voice");
const docsDir = path.join(process.cwd(), "uploads", "documents");

// Papkalarni yaratish
[voiceDir, docsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Allowed formats
const ALLOWED_AUDIO_EXT = new Set([".webm", ".ogg", ".mp3", ".wav", ".m4a"]);
const ALLOWED_DOC_EXT = new Set([".pdf", ".doc", ".docx"]);

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isDoc = ALLOWED_DOC_EXT.has(path.extname(file.originalname).toLowerCase());
    cb(null, isDoc ? docsDir : voiceDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = ALLOWED_DOC_EXT.has(ext) ? "doc" : "voice";
    const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = (file.mimetype || "").toLowerCase();

  const isAudio = ALLOWED_AUDIO_EXT.has(ext) || mimetype.startsWith("audio/") || mimetype === "video/webm";
  const isDoc = ALLOWED_DOC_EXT.has(ext) || 
                mimetype === "application/pdf" || 
                mimetype === "application/msword" || 
                mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isAudio || isDoc) return cb(null, true);

  return cb(new Error("Faqat audio (webm, mp3, etc.) yoki hujjat (pdf, docx) fayllar ruxsat."));
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});


// Helper: BASE_URL bo‘lmasa req’dan yasab beradi (proxy’ni ham hisobga oladi)
function getBaseUrl(req) {
  const envBase = process.env.BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");

  // Render/Proxy holati: x-forwarded-proto bo'lishi mumkin
  const proto =
    (req.headers["x-forwarded-proto"] || req.protocol || "https")
      .toString()
      .split(",")[0]
      .trim();

  const host = req.get("host");
  return `${proto}://${host}`;
}

// Controller
// Generic Upload Controller
const uploadGeneralFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Fayl yuklanmadi." });
    }

    const baseUrl = getBaseUrl(req);
    const ext = path.extname(req.file.filename).toLowerCase();
    const subDir = ALLOWED_DOC_EXT.has(ext) ? "documents" : "voice";
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

// Alias for legacy voice uploads
const uploadVoice = uploadGeneralFile;

module.exports = {
  upload,
  uploadVoice,
  uploadGeneralFile,
};



