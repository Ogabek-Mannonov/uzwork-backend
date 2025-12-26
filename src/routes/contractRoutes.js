// src/routes/contractRoutes.js
const express = require('express');
const router = express.Router();
const {
  createContract,
  getContracts,
  getContractById,
  getMyContracts,
  updateContract,
  completeContract,
  cancelContract,
  updateMilestone,
  createDispute
} = require('../controllers/contractController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getContracts);
router.get('/:id', authenticate, getContractById);

// Protected routes
router.post('/', authenticate, authorize('client'), createContract);
router.get('/my', authenticate, getMyContracts);
router.put('/:id', authenticate, updateContract);
router.put('/:id/milestone', authenticate, updateMilestone);
router.post('/:id/complete', authenticate, authorize('client'), completeContract);
router.post('/:id/cancel', authenticate, cancelContract);
router.post('/:id/dispute', authenticate, createDispute);

module.exports = router;


