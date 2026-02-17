// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  refresh,
  verify,
  kyc,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const { authenticate } = require("../middlewares/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/verify", authenticate, verify);
router.post("/kyc", authenticate, kyc);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);
module.exports = router;
