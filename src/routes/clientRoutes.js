// src/routes/clientRoutes.js
const express = require("express");
const router = express.Router();

const {
  getClients,
  getClientById,
  updateMyProfile,
} = require("../controllers/clientController");

const { authenticate, authorize } = require("../middlewares/authMiddleware");

// ✅ Public
router.get("/", getClients);

// ✅ Protected (STATIC AVVAL)
router.put("/me", authenticate, authorize("client"), updateMyProfile);

// ✅ Dynamic OXIRIDA
router.get("/:id", getClientById);

module.exports = router;
