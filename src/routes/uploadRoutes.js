// src/routes/uploadRoutes.js
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/authMiddleware");
const { upload, uploadVoice } = require("../controllers/uploadController");

// ✅ Voice upload
// field name: "voice"
router.post("/voice", authenticate, upload.single("voice"), uploadVoice);

module.exports = router;
