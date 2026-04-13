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
  getCards,
  addCard,
  deleteCard,
} = require("../controllers/paymentController");

const { authenticate } = require("../middlewares/authMiddleware");

// ⚠️ WEBHOOK DOIM YUQORIDA TURADI
router.post("/webhook", paymentWebhook);

// Protected
router.get("/", authenticate, getPayments);
router.get("/balance", authenticate, getBalance);
router.post("/deposit", authenticate, deposit);
router.post("/withdraw", authenticate, withdraw);

router.post("/escrow/hold", authenticate, escrowHold);
router.post("/contracts/:id/release", authenticate, releaseMilestone);

// Card management
router.get("/cards", authenticate, getCards);
router.post("/cards", authenticate, addCard);
router.delete("/cards/:id", authenticate, deleteCard);

router.get("/:id", authenticate, getPaymentDetail);

module.exports = router;
