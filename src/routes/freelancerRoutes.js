// src/routes/freelancerRoutes.js
const express = require('express');
const router = express.Router();
const {
  getFreelancers,
  getRecommendedFreelancers,
  getFreelancerById,
  activatePremium,
  aiPortfolio,
  getSavedFreelancers,
  saveFreelancer
} = require('../controllers/freelancerController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getFreelancers);
router.get('/recommended', getRecommendedFreelancers);
router.get('/:id', getFreelancerById);

// Protected routes
router.post('/premium', authenticate, authorize('freelancer'), activatePremium);
router.post('/me/ai-portfolio', authenticate, authorize('freelancer'), aiPortfolio);
router.get('/saved', authenticate, getSavedFreelancers);
router.post('/:id/save', authenticate, saveFreelancer);

module.exports = router;

