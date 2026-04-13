// src/routes/projectRoutes.js
const express = require('express');
const router = express.Router();

const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getMyProjects,
  getRecommendedProjects,
  boostProject,
  aiTranslate,
  getSavedProjects,
  saveProject,
  reportProject
} = require('../controllers/projectController');

const { authenticate, authorize, optionalAuthenticate } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getProjects);

// ✅ static routes har doim /:id dan oldin bo‘lsin
router.get('/recommended', authenticate, getRecommendedProjects);
router.get('/my', authenticate, getMyProjects);
router.get('/saved', authenticate, getSavedProjects);

// ✅ ID route eng pastda - optional auth is_saved uchun kerak
router.get('/:id', optionalAuthenticate, getProjectById);

// Protected routes
router.post('/', authenticate, authorize('client'), createProject);
router.post('/:id/boost', authenticate, authorize('client'), boostProject);
router.post('/:id/ai-translate', aiTranslate);

router.post('/:id/save', authenticate, saveProject);
router.post('/:id/report', authenticate, reportProject);

router.put('/:id', authenticate, authorize('client', 'admin'), updateProject);
router.delete('/:id', authenticate, authorize('client', 'admin'), deleteProject);

module.exports = router;
