// src/controllers/notificationController.js
const pool = require('../db/pool');

/**
 * GET /notifications/me
 * Get current user's notifications
 */
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unread_only, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (unread_only === 'true') {
      whereClause += ` AND is_read = FALSE`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM notifications ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get notifications
    const notificationsQuery = `
      SELECT *
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const notificationsResult = await pool.query(notificationsQuery, queryParams);

    res.json({
      success: true,
      data: {
        notifications: notificationsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirishnomalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /notifications/:id/mark-as-read
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bildirishnoma topilmadi.'
      });
    }

    res.json({
      success: true,
      message: 'Bildirishnoma o\'qilgan deb belgilandi.'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /notifications/mark-all-read
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      message: 'Barcha bildirishnomalar o\'qilgan deb belgilandi.'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};

