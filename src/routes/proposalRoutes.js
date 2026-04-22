// src/routes/proposalRoutes.js
const express = require("express");
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
  inviteFreelancer,
  aiWriter,
  aiScore,
} = require("../controllers/proposalController");

const { authenticate, authorize } = require("../middlewares/authMiddleware");

// ✅ Public
router.get("/", getProposals);

// ✅ Protected FIRST (static routes)
router.get("/my", authenticate, authorize("freelancer"), getMyProposals);
router.get("/project/:projectId", authenticate, getProjectProposals);

router.post("/", authenticate, authorize("freelancer"), createProposal);
router.post("/invite", authenticate, authorize("client"), inviteFreelancer);
router.put("/:id", authenticate, authorize("freelancer", "client"), updateProposal);
router.delete("/:id", authenticate, authorize("freelancer"), withdrawProposal);

router.post("/:id/accept", authenticate, authorize("client", "admin"), acceptProposal);
router.post("/:id/reject", authenticate, authorize("client", "admin"), rejectProposal);

router.post("/:id/ai-writer", authenticate, authorize("freelancer"), aiWriter);
router.post("/:id/score", aiScore);

// ✅ Dynamic route LAST
router.get("/:id", getProposalById);

module.exports = router;
