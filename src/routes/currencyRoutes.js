// src/routes/currencyRoutes.js
const express = require('express');
const router = express.Router();
const {
  getRates,
  updateRates
} = require('../controllers/currencyController');

router.get('/rates', getRates);
router.post('/rates', updateRates); // TODO: Add admin check

module.exports = router;


