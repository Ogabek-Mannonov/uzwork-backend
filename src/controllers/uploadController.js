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
// Updated to support documents (CV/Resume) and images
const voiceDir = path.join(process.cwd(), "uploads", "voice");
const docsDir = path.join(process.cwd(), "uploads", "documents");
const imagesDir = path.join(process.cwd(), "uploads", "images");

// Papkalarni yaratish
[voiceDir, docsDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});


// Allowed formats
const ALLOWED_AUDIO_EXT = new Set([".webm", ".ogg", ".mp3", ".wav", ".m4a"]);
const ALLOWED_DOC_EXT = new Set([
  ".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx", 
  ".zip", ".rar", ".7z", ".tar", ".gz", 
  ".mp4", ".mov", ".avi", ".mkv", ".webm",
  ".csv", ".json", ".xml"
]);
const ALLOWED_IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]);

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = (file.mimetype || "").toLowerCase();
    
    if (ALLOWED_IMG_EXT.has(ext) || mimetype.startsWith("image/")) return cb(null, imagesDir);
    if (ALLOWED_AUDIO_EXT.has(ext) || mimetype.startsWith("audio/")) return cb(null, voiceDir);
    
    // Everything else goes to documents
    cb(null, docsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = (file.mimetype || "").toLowerCase();
    
    let prefix = "file";
    if (ALLOWED_IMG_EXT.has(ext) || mimetype.startsWith("image/")) prefix = "img";
    else if (ALLOWED_AUDIO_EXT.has(ext) || mimetype.startsWith("audio/")) prefix = "voice";
    else if (ALLOWED_DOC_EXT.has(ext)) prefix = "doc";
    
    const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter
function fileFilter(req, file, cb) {
  // Allow all for now
  return cb(null, true);
}


const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (Project submissions might be large)
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

    // Determining subDir more robustly
    let subDir = "voice";
    if (ALLOWED_DOC_EXT.has(ext) || req.file.filename.startsWith("doc-")) {
      subDir = "documents";
    } else if (ALLOWED_IMG_EXT.has(ext) || req.file.filename.startsWith("img-")) {
      subDir = "images";
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

// Image Upload Controller (with specific sizing)
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Rasm yuklanmadi." });
    }

    const type = req.body.type || "general"; // 'avatar', 'cover', 'general'
    const baseUrl = getBaseUrl(req);
    const originalPath = req.file.path;
    const ext = path.extname(req.file.filename).toLowerCase();
    const fileName = req.file.filename;

    // sharp bo'lsa o'lchamini to'g'irlaymiz
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

      // Originalni o'chiramiz (ixtiyoriy, lekin diskni tejash uchun yaxshi)
      try { fs.unlinkSync(originalPath); } catch (e) { }

      const fileUrl = `${baseUrl}/uploads/images/${processedName}`;
      return res.status(201).json({
        success: true,
        message: "Rasm optimallashtirib yuklandi",
        data: { url: fileUrl, filename: processedName }
      });
    }

    // sharp bo'lmasa yoki general bo'lsa shunchaki URL qaytaramiz
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

// Alias for legacy voice uploads
const uploadVoice = uploadGeneralFile;

module.exports = {
  upload,
  uploadVoice,
  uploadGeneralFile,
  uploadImage,
};




