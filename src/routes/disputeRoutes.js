const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../controllers/adminController");

const {
  createDispute,
  getMyDisputes,
  getDisputes,       // admin list
  getDisputeById,    // detail
  updateDisputeStatus,
  resolveDispute,
} = require("../controllers/disputeController");

// client/freelancer
router.post("/", authenticate, createDispute);
router.get("/my", authenticate, getMyDisputes);

// admin
router.get("/", authenticate, isAdmin, getDisputes);
router.get("/:id", authenticate, isAdmin, getDisputeById);
router.patch("/:id/status", authenticate, isAdmin, updateDisputeStatus);
router.post("/:id/resolve", authenticate, isAdmin, resolveDispute);

module.exports = router;
