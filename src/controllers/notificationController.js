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

    const notificationsQuery = `
      SELECT id, user_id, type, title, body as message, is_read, data, created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const notificationsResult = await pool.query(notificationsQuery, queryParams);

    // Map body to message if needed by frontend (already doing body as message in SQL)
    const formattedNotifications = notificationsResult.rows;

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
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

/**
 * GET /notifications/unread-proposals-count
 */
const getUnreadProposalsCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query = "";
    if (role === "client") {
      // Count unread proposals for jobs owned by this client
      query = `
        SELECT COUNT(*)::int as count 
        FROM proposals p
        JOIN jobs j ON j.id = p.job_id
        WHERE j.client_id = $1 AND p.viewed_at IS NULL AND j.deleted_at IS NULL
      `;
    } else {
      // Count unread invitations for this freelancer
      query = `
        SELECT COUNT(*)::int as count 
        FROM proposals p
        JOIN jobs j ON j.id = p.job_id
        WHERE p.freelancer_id = $1 AND p.status = 'invited' AND p.viewed_at IS NULL AND j.deleted_at IS NULL
      `;
    }

    const result = await pool.query(query, [userId]);
    return res.json({
      success: true,
      data: {
        unread_count: result.rows[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Get unread proposals count error:', error);
    res.status(500).json({
      success: false,
      message: 'Xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * Internal helper to create a notification and emit socket event
 * Can be called from other controllers
 */
const createNotification = async (io, {
  userId,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null
}) => {
  try {
    const data = JSON.stringify({ related_id: relatedId, related_type: relatedType });
    const query = `
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, type, title, body as message, is_read, data, created_at
    `;
    const values = [userId, type, title, message, data];
    const result = await pool.query(query, values);
    const notification = result.rows[0];
    const targetRoom = `user_${String(userId)}`;

    if (io) {
      console.log(`📡 Emitting newNotification to room: ${targetRoom}`);
      io.to(targetRoom).emit('newNotification', notification);
    } else {
      console.warn('⚠️ Socket.io (io) instance NOT FOUND in createNotification');
    }
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadProposalsCount,
  createNotification
};

