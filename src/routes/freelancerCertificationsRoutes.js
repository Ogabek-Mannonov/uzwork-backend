const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middlewares/authMiddleware");
const uploadCertification = require("../middlewares/uploadCertification");

const {
  getPublicCertificationsByFreelancerId,
  getMyCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  uploadCertificationFile,
  deleteCertificationFile,
} = require("../controllers/freelancerCertificationsController");

// ✅ Protected /me/* routes AVVAL (/:id wildcard dan oldin!)
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

// ✅ Public /:id/* routes OXIRIDA (wildcard — "me" ni tutib qolmasligi uchun)
router.get("/:id/certifications", getPublicCertificationsByFreelancerId);

module.exports = router;

