// src/controllers/supportController.js
const pool = require('../db/pool');

/**
 * POST /support/ticket
 * Create support ticket
 */
const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, message, priority = 'normal' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject va message kerak.'
      });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (
        user_id, subject, message, priority
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [userId, subject, message, priority]
    );

    res.status(201).json({
      success: true,
      message: 'Ticket yaratildi!',
      data: {
        ticket: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Ticket yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /support/tickets
 * Get my support tickets
 */
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      queryParams.push(status);
    }

    const result = await pool.query(
      `SELECT *
       FROM support_tickets
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        tickets: result.rows
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Ticketlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  createTicket,
  getMyTickets
};

