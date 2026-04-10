// src/routes/profileRoutes.js
const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  getUserProfile,
  updateMyProfile,
  getCategories,
} = require("../controllers/profileController");

const { authenticate } = require("../middlewares/authMiddleware");

// Protected (AVVAL)
router.get("/me", authenticate, getMyProfile);
router.put("/me", authenticate, updateMyProfile);

// Public (KEYIN)
router.get("/categories", getCategories);
router.get("/:userId", getUserProfile);

module.exports = router;
