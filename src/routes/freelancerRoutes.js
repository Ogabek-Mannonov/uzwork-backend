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

const {
  getPublicCertificationsByFreelancerId,
  getMyCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  uploadCertificationFile,
  deleteCertificationFile,
} = require("../controllers/freelancerCertificationsController");

const { authenticate, authorize, optionalAuthenticate } = require("../middlewares/authMiddleware");
const uploadCv = require("../middlewares/uploadCv");
const uploadPortfolio = require("../middlewares/uploadPortfolio");
const uploadCertification = require("../middlewares/uploadCertification");

// ✅ Public
router.get("/", optionalAuthenticate, getFreelancers);
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

// ✅ Certifications — /me/* static OLDIN, /:id/* dynamic KEYIN
router.get("/me/certifications", authenticate, authorize("freelancer"), getMyCertifications);
router.post("/me/certifications", authenticate, authorize("freelancer"), createCertification);
router.put("/me/certifications/:certId", authenticate, authorize("freelancer"), updateCertification);
router.delete("/me/certifications/:certId", authenticate, authorize("freelancer"), deleteCertification);
router.post(
  "/me/certifications/:certId/file",
  authenticate,
  authorize("freelancer"),
  uploadCertification.single("file"),
  uploadCertificationFile
);
router.delete(
  "/me/certifications/:certId/file",
  authenticate,
  authorize("freelancer"),
  deleteCertificationFile
);

// ✅ Dynamic OXIRIDA
router.get("/:id", getFreelancerById);
router.get("/:id/portfolio", getPublicPortfolioByFreelancerId);
router.get("/:id/certifications", getPublicCertificationsByFreelancerId);

module.exports = router;
