const express = require('express');
const router = express.Router();
const { getSkills } = require('../controllers/skillController');

// GET /api/skills
router.get('/', getSkills);

module.exports = router;
