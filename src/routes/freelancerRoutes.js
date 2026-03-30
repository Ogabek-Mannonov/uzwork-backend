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
  getMyPortfolio,
  getPublicPortfolioByFreelancerId,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  addPortfolioMedia,
  deletePortfolioMedia,
} = require("../controllers/freelancerController");

const { authenticate, authorize } = require("../middlewares/authMiddleware");
const uploadCv = require("../middlewares/uploadCv");
const uploadPortfolio = require("../middlewares/uploadPortfolio");

// ✅ Public
router.get("/", getFreelancers);
router.get("/recommended", getRecommendedFreelancers);

// ✅ Protected STATIC ROUTES (AVVAL!)
router.get("/saved", authenticate, authorize("client", "admin"), getSavedFreelancers);
router.post("/premium", authenticate, authorize("freelancer"), activatePremium);
router.post("/me/ai-portfolio", authenticate, authorize("freelancer"), aiPortfolio);
router.post("/:id/save", authenticate, authorize("client", "admin"), saveFreelancer);

router.post(
  "/me/cv",
  authenticate,
  authorize("freelancer"),
  uploadCv.single("cv"),
  uploadMyCv
);
router.delete("/me/cv", authenticate, authorize("freelancer"), deleteMyCv);

// ✅ Protected portfolio (freelancer)
router.get("/me/portfolio", authenticate, authorize("freelancer"), getMyPortfolio);
router.post("/me/portfolio", authenticate, authorize("freelancer"), createPortfolioItem);
router.put("/me/portfolio/:itemId", authenticate, authorize("freelancer"), updatePortfolioItem);
router.delete("/me/portfolio/:itemId", authenticate, authorize("freelancer"), deletePortfolioItem);

// media upload (images/pdf) — form-data: media=<file>
router.post(
  "/me/portfolio/:itemId/media",
  authenticate,
  authorize("freelancer"),
  uploadPortfolio.single("media"),
  addPortfolioMedia
);

router.delete(
  "/me/portfolio/:itemId/media/:mediaId",
  authenticate,
  authorize("freelancer"),
  deletePortfolioMedia
);

// ✅ Dynamic OXIRIDA
router.get("/:id", getFreelancerById);
router.get("/:id/portfolio", getPublicPortfolioByFreelancerId);

module.exports = router;
