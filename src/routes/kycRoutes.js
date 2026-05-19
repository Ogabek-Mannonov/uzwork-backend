// src/routes/kycRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../controllers/adminController');
const { upload, uploadImage } = require('../controllers/uploadController');
const {
  submitKyc,
  getKycStatus,
  getKycList,
  approveKyc,
  rejectKyc,
  createFaceSession,
  getFaceSessionStatus,
  serveMobilePage,
  checkFaceToken,
  submitFaceSelfie,
} = require('../controllers/kycController');

// ── User endpoints (auth kerak) ───────────────────────────────
router.post('/submit', authenticate, submitKyc);
router.get('/status', authenticate, getKycStatus);

// ── Face verification — Desktop (auth kerak) ──────────────────
router.post('/face/create-session', authenticate, createFaceSession);
router.get('/face/:token/status', authenticate, getFaceSessionStatus);

// ── Face verification — Mobile (auth SHART EMAS) ──────────────
// GET /kyc/face/:token  → Telefon uchun standalone HTML sahifa
router.get('/face/:token', serveMobilePage);
// GET /kyc/face/:token/check → JSON polling (frontend React uchun)
router.get('/face/:token/check', checkFaceToken);
// POST /kyc/face/:token/upload → Selfie rasmni yuklash (Public)
router.post('/face/:token/upload', (req, res, next) => {
  console.log('Upload request received for token:', req.params.token);
  next();
}, upload.single('image'), uploadImage);
// POST /kyc/face/:token/submit → Selfie yuborish va yakunlash
router.post('/face/:token/submit', submitFaceSelfie);

// ── Admin endpoints ────────────────────────────────────────────
router.get('/admin/list', authenticate, isAdmin, getKycList);
router.post('/admin/:submissionId/approve', authenticate, isAdmin, approveKyc);
router.post('/admin/:submissionId/reject', authenticate, isAdmin, rejectKyc);

module.exports = router;
