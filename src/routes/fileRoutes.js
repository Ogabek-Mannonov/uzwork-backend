// src/routes/fileRoutes.js
const express = require("express");
const router = express.Router();

const { uploadFile, getFiles } = require("../controllers/fileController");
const { authenticate } = require("../middlewares/authMiddleware");

// /files/upload
router.post("/upload", authenticate, uploadFile);

// /files?related_type=&related_id=&page=&limit=
router.get("/", authenticate, getFiles);

module.exports = router;
