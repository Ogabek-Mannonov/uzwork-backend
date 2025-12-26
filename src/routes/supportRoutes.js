// src/routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const {
  createTicket,
  getMyTickets
} = require('../controllers/supportController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/ticket', authenticate, createTicket);
router.get('/tickets', authenticate, getMyTickets);

module.exports = router;

