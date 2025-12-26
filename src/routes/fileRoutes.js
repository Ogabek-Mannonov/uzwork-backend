// src/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const {
  uploadFile,
  getFiles
} = require('../controllers/fileController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/upload', authenticate, uploadFile);
router.get('/', authenticate, getFiles);

module.exports = router;

