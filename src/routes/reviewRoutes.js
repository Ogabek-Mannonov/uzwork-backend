// src/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const {
  createReview,
  getReviews,
  getReviewById,
  getUserReviews,
  updateReview
} = require('../controllers/reviewController');
const { authenticate } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getReviews);
router.get('/:id', getReviewById);
router.get('/user/:userId', getUserReviews);

// Protected routes
router.post('/', authenticate, createReview);
router.put('/:id', authenticate, updateReview);

module.exports = router;



