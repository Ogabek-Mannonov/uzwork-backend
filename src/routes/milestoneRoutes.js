const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/authMiddleware");

const {
  submitMilestone,
  approveMilestone,
  releaseMilestone,
} = require("../controllers/milestoneController");

// freelancer
router.post("/:id/submit", authenticate, submitMilestone);

// client
router.post("/:id/approve", authenticate, approveMilestone);

// system/admin (hozircha admin bilan)
router.post("/:id/release", authenticate, releaseMilestone);

module.exports = router;
