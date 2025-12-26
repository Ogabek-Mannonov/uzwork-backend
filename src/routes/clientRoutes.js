// src/routes/clientRoutes.js
const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  updateMyProfile
} = require('../controllers/clientController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getClients);
router.get('/:id', getClientById);

// Protected routes
router.put('/me', authenticate, authorize('client'), updateMyProfile);

module.exports = router;

