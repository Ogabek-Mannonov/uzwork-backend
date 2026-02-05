// src/controllers/uploadController.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Render/Production uchun: project rootdan ishlash yaxshiroq
const uploadDir = path.join(process.cwd(), "uploads", "voice");

// Papka yo'q bo'lsa yaratamiz
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed audio formats
const ALLOWED_EXT = new Set([".webm", ".ogg", ".mp3", ".wav", ".m4a"]);
const ALLOWED_MIME_PREFIX = ["audio/"];
const ALLOWED_MIME_EXACT = new Set(["video/webm"]); // ba'zi brauzerlar voice uchun shuni yuboradi

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".webm";
    const safeExt = ALLOWED_EXT.has(ext) ? ext : ".webm";
    const uniqueName = `voice-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, uniqueName);
  },
});

// File filter
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mimetype = (file.mimetype || "").toLowerCase();

  const extOk = ALLOWED_EXT.has(ext);
  const mimeOk =
    ALLOWED_MIME_PREFIX.some((p) => mimetype.startsWith(p)) || ALLOWED_MIME_EXACT.has(mimetype);

  // ✅ Ikalasidan biri mos bo'lsa o'tkazamiz
  if (extOk || mimeOk) return cb(null, true);

  return cb(
    new Error("Faqat audio fayllar ruxsat (webm, ogg, mp3, wav, m4a).")
  );
}

// Multer instance
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
const uploadVoice = async (req, res) => {
  try {
    // multer error bo'lsa (limit, filter) shu yerda ham ushlab qolamiz
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Fayl yuklanmadi (voice).",
      });
    }

    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/voice/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: "Ovozli fayl yuklandi",
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

module.exports = {
  upload,
  uploadVoice,
};
