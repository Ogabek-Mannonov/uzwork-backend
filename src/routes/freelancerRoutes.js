// src/routes/freelancerRoutes.js
const express = require("express");
const router = express.Router();

const {
  getFreelancers,
  getRecommendedFreelancers,
  getFreelancerById,
  activatePremium,
  aiPortfolio,
  getSavedFreelancers,
  saveFreelancer,
  uploadMyCv,
  deleteMyCv,
} = require("../controllers/freelancerController");

const { authenticate, authorize } = require("../middlewares/authMiddleware");
const uploadCv = require("../middlewares/uploadCv");

// ✅ Public
router.get("/", getFreelancers);
router.get("/recommended", getRecommendedFreelancers);

// ✅ Protected STATIC ROUTES (AVVAL!)
router.get("/saved", authenticate, authorize("client", "admin"), getSavedFreelancers);
router.post("/premium", authenticate, authorize("freelancer"), activatePremium);
router.post("/me/ai-portfolio", authenticate, authorize("freelancer"), aiPortfolio);
router.post("/:id/save", authenticate, authorize("client", "admin"), saveFreelancer);

// ✅ Dynamic OXIRIDA
router.get("/:id", getFreelancerById);
router.post(
  "/me/cv",
  authenticate,
  authorize("freelancer"),
  uploadCv.single("cv"),
  uploadMyCv
);

module.exports = router;
