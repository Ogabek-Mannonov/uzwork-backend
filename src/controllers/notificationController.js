// src/controllers/notificationController.js
const pool = require('../db/pool');
const sendEmail = require('../utils/sendEmail');

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
      SELECT 
        id, user_id, type, 
        title, body as message, 
        title_en, title_ru, body_en, body_ru,
        is_read, data, created_at
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

    const notification = result.rows[0];
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit('notificationRead', { id, type: notification.type });
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

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit('notificationsAllRead');
    }

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
    if (role?.toLowerCase() === "client") {
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
 * POST /notifications/mark-all-read-by-type
 */
const markAllAsReadByType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { typePrefix } = req.body;

    if (!typePrefix) {
      return res.status(400).json({ success: false, message: 'typePrefix majburiy.' });
    }

    let query = "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE AND type LIKE $2";
    let params = [userId, `${typePrefix}%`];

    // Agar proposal bo'lsa, job_invitation ni ham o'qilgan deb belgilaymiz
    if (typePrefix === 'proposal') {
      query = "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE AND (type LIKE $2 OR type = 'job_invitation')";
    }

    await pool.query(query, params);

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit('notificationsAllReadByType', { typePrefix });
    }

    res.json({
      success: true,
      message: `${typePrefix} turidagi bildirishnomalar o'qilgan deb belgilandi.`
    });
  } catch (error) {
    console.error('Mark all by type as read error:', error);
    res.status(500).json({ success: false, message: 'Xato yuz berdi.' });
  }
};

const { getNotificationTranslations } = require('../utils/translations');

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
  relatedType = null,
  translationData = {} // Dynamic data for translations (e.g. { jobTitle: '...', freelancerName: '...' })
}) => {
  try {
    // 1. Get translations if available
    const trans = getNotificationTranslations(type, translationData);
    
    // Use translations if available, otherwise fallback to provided title/message
    const title_uz = trans?.title_uz || title;
    const title_en = trans?.title_en || title;
    const title_ru = trans?.title_ru || title;
    const body_uz = trans?.body_uz || message;
    const body_en = trans?.body_en || message;
    const body_ru = trans?.body_ru || message;

    // 2. Check user notification settings and get email
    const userRes = await pool.query(
      `SELECT s.*, u.email 
       FROM users u 
       LEFT JOIN user_notification_settings s ON u.id = s.user_id 
       WHERE u.id = $1`,
      [userId]
    );
    const user = userRes.rows[0];
    const settings = user;
    
    // If settings exist, check if this specific type is enabled
    const isProposalReceivedEnabled = settings?.proposal_received ?? true;
    const isProposalWithdrawnEnabled = settings?.proposal_withdrawn ?? true;
    const isPaymentEnabled = settings?.payment_success ?? true;
    const isInvoiceEnabled = settings?.invoice_ready ?? true;

    if (type === 'proposal_received' && !isProposalReceivedEnabled) return null;
    if (type === 'proposal_withdrawn' && !isProposalWithdrawnEnabled) return null;
    if (['payment_success', 'payment_received', 'payment_sent'].includes(type) && !isPaymentEnabled) return null;
    if (type === 'invoice_ready' && !isInvoiceEnabled) return null;

    const isPushEnabled = settings?.push_notifications ?? true;
    const isEmailEnabled = settings?.email_notifications ?? true;


    const data = JSON.stringify({ 
      related_id: relatedId, 
      related_type: relatedType,
      ...translationData  // Store clientName, jobTitle, etc. for future reconstruction
    });

    const query = `
      INSERT INTO notifications (
        user_id, type, title, body, 
        title_en, title_ru, body_en, body_ru,
        data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, user_id, type, 
        title, body as message, 
        title_en, title_ru, body_en, body_ru,
        is_read, data, created_at
    `;
    const values = [
      userId, type, title_uz, body_uz, 
      title_en, title_ru, body_en, body_ru,
      data
    ];
    const result = await pool.query(query, values);
    const notification = result.rows[0];
    
    const targetRoom = `user_${String(userId)}`;

    // Push notification (socket emit)
    if (io) {
      if (isPushEnabled) {
        console.log(`📡 Emitting newNotification to room: ${targetRoom}`);
        io.to(targetRoom).emit('newNotification', notification);
      }
    } else {
      console.warn('⚠️ Socket.io (io) instance NOT FOUND in createNotification');
    }

    // Email notification
    if (isEmailEnabled && user?.email) {
      console.log(`📧 Sending notification email to: ${user.email}`);
      sendEmail({
        to: user.email,
        subject: `UzWork: ${title}`,
        text: message,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #3b82f6; margin-top: 0;">UzWork Bildirishnomasi</h2>
            <p style="font-size: 16px; color: #374151;">${message}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">
              Siz ushbu xatni UzWork platformasidagi sozlamalaringiz asosida oldingiz. 
              Xabarnoma sozlamalarini o'zgartirish uchun profilingizga kiring.
            </p>
          </div>
        `
      }).catch(err => console.error('Email notification failed:', err));
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};


/**
 * GET /notifications/settings
 */
const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM user_notification_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Default settings if none found
      const defaultSettings = {
        user_id: userId,
        proposal_received: true,
        proposal_withdrawn: true,
        payment_success: true,
        invoice_ready: true,
        email_notifications: true,
        push_notifications: true
      };
      return res.json({ success: true, data: defaultSettings });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ success: false, message: 'Sozlamalarni olishda xato yuz berdi.' });
  }
};

/**
 * PUT /notifications/settings
 */
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      proposal_received,
      proposal_withdrawn,
      payment_success,
      invoice_ready,
      email_notifications,
      push_notifications
    } = req.body;

    const query = `
      INSERT INTO user_notification_settings (
        user_id, proposal_received, proposal_withdrawn, 
        payment_success, invoice_ready, email_notifications, push_notifications,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        proposal_received = COALESCE(EXCLUDED.proposal_received, user_notification_settings.proposal_received),
        proposal_withdrawn = COALESCE(EXCLUDED.proposal_withdrawn, user_notification_settings.proposal_withdrawn),
        payment_success = COALESCE(EXCLUDED.payment_success, user_notification_settings.payment_success),
        invoice_ready = COALESCE(EXCLUDED.invoice_ready, user_notification_settings.invoice_ready),
        email_notifications = COALESCE(EXCLUDED.email_notifications, user_notification_settings.email_notifications),
        push_notifications = COALESCE(EXCLUDED.push_notifications, user_notification_settings.push_notifications),
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      userId,
      proposal_received,
      proposal_withdrawn,
      payment_success,
      invoice_ready,
      email_notifications,
      push_notifications
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Sozlamalar yangilandi.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ success: false, message: 'Sozlamalarni yangilashda xato yuz berdi.' });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getSettings,
  updateSettings,
  getUnreadProposalsCount,
  markAllAsReadByType,
  createNotification
};

