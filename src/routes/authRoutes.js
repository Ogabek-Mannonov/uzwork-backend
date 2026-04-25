// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  refresh,
  verify,
  verifySignup,
  kyc,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  googleLogin,
  enable2FA,
  confirm2FA,
  disable2FA,
  verify2FALogin,
  changePassword,
  getSessions,
  revokeSession,
} = require("../controllers/authController");

const { authenticate } = require("../middlewares/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/google", googleLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authenticate, changePassword);

router.post("/verify", authenticate, verify);
router.post("/verify-signup", verifySignup);
router.post("/kyc", authenticate, kyc);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

// 2FA Routes
router.post("/2fa/enable", authenticate, enable2FA);
router.post("/2fa/confirm", authenticate, confirm2FA);
router.post("/2fa/disable", authenticate, disable2FA);
router.post("/2fa/verify-login", verify2FALogin);
router.get("/sessions", authenticate, getSessions);
router.delete("/sessions/:sessionId", authenticate, revokeSession);

module.exports = router;
