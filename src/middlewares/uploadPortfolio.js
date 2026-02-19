const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(process.cwd(), "uploads", "portfolio");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".bin";
    cb(null, `pf_${req.user.id}_${Date.now()}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Portfolio fayl faqat JPG/PNG/WEBP yoki PDF bo‘lishi mumkin."), false);
  }
  cb(null, true);
};

const uploadPortfolio = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

module.exports = uploadPortfolio;
