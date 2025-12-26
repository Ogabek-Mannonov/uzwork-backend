// src/routes/marketplaceRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMarketplace,
  getCategories,
  getProductById,
  createProduct,
  buyProduct
} = require('../controllers/marketplaceController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getMarketplace);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Protected routes
router.post('/', authenticate, authorize('freelancer'), createProduct);
router.post('/:id/buy', authenticate, buyProduct);

module.exports = router;


