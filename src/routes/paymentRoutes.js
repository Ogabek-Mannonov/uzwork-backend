// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPayments,
  getBalance,
  deposit,
  withdraw,
  paymentWebhook,
  releaseMilestone
} = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/authMiddleware');

// Protected routes
router.get('/', authenticate, getPayments);
router.get('/balance', authenticate, getBalance);
router.post('/deposit', authenticate, deposit);
router.post('/withdraw', authenticate, withdraw);
router.post('/webhook', paymentWebhook); // Public for payment providers
router.post('/contracts/:id/release', authenticate, releaseMilestone);

module.exports = router;

