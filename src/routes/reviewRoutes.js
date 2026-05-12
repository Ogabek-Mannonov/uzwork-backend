// src/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const {
  createReview,
  getReviews,
  getReviewById,
  getUserReviews,
  updateReview,
  getPendingReview
} = require('../controllers/reviewController');
const { authenticate } = require('../middlewares/authMiddleware');

// Protected routes & specific routes
router.get('/pending', authenticate, getPendingReview);

// Public routes
router.get('/', getReviews);
router.get('/:id', getReviewById);
router.get('/user/:userId', getUserReviews);

router.post('/', authenticate, createReview);
router.put('/:id', authenticate, updateReview);

module.exports = router;



