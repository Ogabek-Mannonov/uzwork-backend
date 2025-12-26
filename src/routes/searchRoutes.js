// src/routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');

// Public route
router.get('/', globalSearch);

module.exports = router;

