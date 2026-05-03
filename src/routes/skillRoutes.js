const express = require('express');
const router = express.Router();
const { getSkills, getCategories } = require('../controllers/skillController');

// GET /api/skills
router.get('/', getSkills);

// GET /api/skills/categories  
router.get('/categories', getCategories);

module.exports = router;
