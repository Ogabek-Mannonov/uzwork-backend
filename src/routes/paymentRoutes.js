// src/routes/paymentRoutes.js
const express = require("express");
const router = express.Router();

const {
  getPayments,
  getBalance,
  deposit,
  withdraw,
  paymentWebhook,
  releaseMilestone,
  escrowHold,
  getPaymentDetail,
} = require("../controllers/paymentController");

const { authenticate } = require("../middlewares/authMiddleware");

// Protected
router.get("/", authenticate, getPayments);
router.get("/balance", authenticate, getBalance);
router.post("/deposit", authenticate, deposit);
router.post("/withdraw", authenticate, withdraw);
router.post("/contracts/:id/release", authenticate, releaseMilestone);
router.post("/escrow/hold", authenticate, escrowHold);
router.get("/:id", authenticate, getPaymentDetail);

// Public (payment provider webhook) — keyin signature tekshir qo‘shamiz
router.post("/webhook", paymentWebhook);

module.exports = router;
