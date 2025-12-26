// src/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const {
  jobMatch,
  translate,
  generatePortfolio,
  proposalWriter,
  proposalScore
} = require('../controllers/aiController');
const { authenticate } = require('../middlewares/authMiddleware');

// Protected routes
router.post('/job-match', authenticate, jobMatch);
router.post('/translate', translate);
router.post('/portfolio-generate', authenticate, generatePortfolio);
router.post('/proposal-writer', authenticate, proposalWriter);
router.post('/proposal-score', proposalScore);

module.exports = router;


