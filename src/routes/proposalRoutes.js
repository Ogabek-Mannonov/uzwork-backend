// src/routes/proposalRoutes.js
const express = require('express');
const router = express.Router();
const {
  createProposal,
  getProposals,
  getProposalById,
  getMyProposals,
  getProjectProposals,
  updateProposal,
  withdrawProposal,
  acceptProposal,
  rejectProposal,
  aiWriter,
  aiScore
} = require('../controllers/proposalController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getProposals);
router.get('/:id', getProposalById);

// Protected routes
router.post('/', authenticate, authorize('freelancer'), createProposal);
router.get('/my', authenticate, authorize('freelancer'), getMyProposals);
router.get('/project/:projectId', authenticate, authorize('client'), getProjectProposals);
router.put('/:id', authenticate, authorize('freelancer'), updateProposal);
router.delete('/:id', authenticate, authorize('freelancer'), withdrawProposal);
router.post('/:id/accept', authenticate, authorize('client'), acceptProposal);
router.post('/:id/reject', authenticate, authorize('client'), rejectProposal);
router.post('/:id/ai-writer', authenticate, authorize('freelancer'), aiWriter);
router.post('/:id/score', aiScore);

module.exports = router;


