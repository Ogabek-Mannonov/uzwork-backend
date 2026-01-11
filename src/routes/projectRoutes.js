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

const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getProjects);
router.get('/recommended', authenticate, getRecommendedProjects);
router.get('/:id', getProjectById);

// Protected routes
router.get('/my', authenticate, getMyProjects);
router.get('/saved', authenticate, getSavedProjects);
router.post('/', authenticate, authorize('client'), createProject);
router.post('/:id/boost', authenticate, authorize('client'), boostProject);
router.post('/:id/ai-translate', aiTranslate);
router.post('/:id/save', authenticate, saveProject);
router.post('/:id/report', authenticate, reportProject);
router.put('/:id', authenticate, authorize('client'), updateProject);
router.delete('/:id', authenticate, authorize('client'), deleteProject);

module.exports = router;

