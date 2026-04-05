// src/routes/uploadRoutes.js
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/authMiddleware");
const { upload, uploadGeneralFile, uploadVoice } = require("../controllers/uploadController");

// ✅ Voice upload (legacy support)
router.post("/voice", authenticate, upload.single("voice"), uploadVoice);

// ✅ General file upload (CV, etc.)
// field name: "file"
router.post("/", authenticate, upload.single("file"), uploadGeneralFile);

module.exports = router;

