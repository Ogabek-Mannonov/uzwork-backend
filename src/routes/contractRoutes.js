// src/routes/contractRoutes.js
const express = require('express');
const router = express.Router();

const {
  // createContract,
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

// Public
router.get('/', getContracts);

// Protected (my MUST be before :id)
router.get('/my', authenticate, getMyContracts);

// router.post('/', authenticate, authorize('client'), createContract);

router.get('/:id', authenticate, getContractById);
router.put('/:id', authenticate, updateContract);

router.put('/:id/milestone', authenticate, updateMilestone);

router.post('/:id/complete', authenticate, authorize('client'), completeContract);
router.post('/:id/cancel', authenticate, cancelContract);
router.post('/:id/dispute', authenticate, createDispute);

module.exports = router;
