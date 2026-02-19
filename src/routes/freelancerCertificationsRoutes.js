const express = require("express");
const router = express.Router();

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

// ✅ Public (MUST be before "/:id")
router.get("/:id/certifications", getPublicCertificationsByFreelancerId);

// ✅ Protected (freelancer)
router.get("/me/certifications", authenticate, authorize("freelancer"), getMyCertifications);
router.post("/me/certifications", authenticate, authorize("freelancer"), createCertification);
router.put("/me/certifications/:certId", authenticate, authorize("freelancer"), updateCertification);
router.delete("/me/certifications/:certId", authenticate, authorize("freelancer"), deleteCertification);

// ✅ Upload file (optional)
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

module.exports = router;

