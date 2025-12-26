// src/controllers/messageController.js
const pool = require('../db/pool');

/**
 * GET /messages
 * Get all chats for current user
 */
const getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get unique chat partners
    const chatsQuery = `
      SELECT DISTINCT
        CASE 
          WHEN sender_id = $1 THEN receiver_id
          ELSE sender_id
        END as partner_id,
        MAX(created_at) as last_message_at,
        COUNT(*) FILTER (WHERE receiver_id = $1 AND is_read = FALSE) as unread_count
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      GROUP BY partner_id
      ORDER BY last_message_at DESC
    `;

    const chatsResult = await pool.query(chatsQuery, [userId]);

    // Get partner info
    const chatsWithInfo = await Promise.all(
      chatsResult.rows.map(async (chat) => {
        const partnerResult = await pool.query(
          'SELECT id, first_name, last_name, email, role FROM users WHERE id = $1',
          [chat.partner_id]
        );
        return {
          ...chat,
          partner: partnerResult.rows[0]
        };
      })
    );

    res.json({
      success: true,
      data: {
        chats: chatsWithInfo
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Chatlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /messages/:chatId
 * Get chat history
 */
const getChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Parse chatId (format: "user1-user2" or "project_id")
    let partnerId;
    let projectId = null;

    if (chatId.includes('-')) {
      const [id1, id2] = chatId.split('-').map(Number);
      partnerId = id1 === userId ? id2 : id1;
    } else {
      projectId = parseInt(chatId);
    }

    let whereClause = '';
    let queryParams = [userId];
    let paramIndex = 2;

    if (projectId) {
      whereClause = 'WHERE project_id = $' + paramIndex++;
      queryParams.push(projectId);
    } else if (partnerId) {
      whereClause = `WHERE ((sender_id = $1 AND receiver_id = $${paramIndex}) OR (sender_id = $${paramIndex} AND receiver_id = $1))`;
      queryParams.push(partnerId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri chat ID.'
      });
    }

    // Get messages
    const messagesQuery = `
      SELECT 
        m.*,
        u_sender.first_name as sender_first_name,
        u_sender.last_name as sender_last_name,
        u_receiver.first_name as receiver_first_name,
        u_receiver.last_name as receiver_last_name
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      JOIN users u_receiver ON m.receiver_id = u_receiver.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const messagesResult = await pool.query(messagesQuery, queryParams);

    // Mark messages as read
    if (partnerId) {
      await pool.query(
        'UPDATE messages SET is_read = TRUE WHERE receiver_id = $1 AND sender_id = $2',
        [userId, partnerId]
      );
    }

    res.json({
      success: true,
      data: {
        messages: messagesResult.rows.reverse() // Reverse to show oldest first
      }
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Chat tarixini olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /messages
 * Send a message
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      receiver_id,
      project_id,
      message_text,
      message_type = 'text',
      file_url,
      voice_url,
      video_call_link
    } = req.body;

    if (!receiver_id && !project_id) {
      return res.status(400).json({
        success: false,
        message: 'Receiver_id yoki project_id kerak.'
      });
    }

    if (!message_text && !file_url && !voice_url && !video_call_link) {
      return res.status(400).json({
        success: false,
        message: 'Xabar matni yoki fayl kerak.'
      });
    }

    // Generate chat_id
    let chatId;
    if (project_id) {
      chatId = `project_${project_id}`;
    } else {
      const ids = [userId, receiver_id].sort((a, b) => a - b);
      chatId = `${ids[0]}-${ids[1]}`;
    }

    // Insert message
    const result = await pool.query(
      `INSERT INTO messages (
        chat_id, sender_id, receiver_id, project_id,
        message_text, message_type, file_url, voice_url, video_call_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        chatId,
        userId,
        receiver_id || null,
        project_id || null,
        message_text || null,
        message_type,
        file_url || null,
        voice_url || null,
        video_call_link || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Xabar yuborildi!',
      data: {
        message: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Xabar yuborishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /messages/:chatId/voice
 * Send voice message
 */
const sendVoiceMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { voice_url, receiver_id, project_id } = req.body;

    if (!voice_url) {
      return res.status(400).json({
        success: false,
        message: 'Voice URL kerak.'
      });
    }

    // Similar to sendMessage but with voice_url
    const result = await pool.query(
      `INSERT INTO messages (
        chat_id, sender_id, receiver_id, project_id,
        message_type, voice_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [chatId, userId, receiver_id || null, project_id || null, 'voice', voice_url]
    );

    res.status(201).json({
      success: true,
      message: 'Ovozli xabar yuborildi!',
      data: {
        message: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Send voice message error:', error);
    res.status(500).json({
      success: false,
      message: 'Ovozli xabar yuborishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /messages/:chatId/video-call
 * Start video call
 */
const startVideoCall = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { video_call_link, receiver_id, project_id } = req.body;

    if (!video_call_link) {
      return res.status(400).json({
        success: false,
        message: 'Video call link kerak.'
      });
    }

    const result = await pool.query(
      `INSERT INTO messages (
        chat_id, sender_id, receiver_id, project_id,
        message_type, video_call_link
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [chatId, userId, receiver_id || null, project_id || null, 'video_call', video_call_link]
    );

    res.status(201).json({
      success: true,
      message: 'Video call boshlandi!',
      data: {
        message: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Start video call error:', error);
    res.status(500).json({
      success: false,
      message: 'Video call boshlashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  getChats,
  getChatHistory,
  sendMessage,
  sendVoiceMessage,
  startVideoCall
};


