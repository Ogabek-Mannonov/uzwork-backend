// src/controllers/messageController.js
const pool = require('../db/pool');

/**
 * GET /messages
 * Get all chats for current user
 */
const getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    const chatsQuery = `
      SELECT 
        c.id AS chat_id,
        c.job_id,
        c.contract_id,
        c.created_at AS chat_created_at,
        MAX(m.created_at) AS last_message_at,
        -- Oxirgi xabar matni (optional)
        (SELECT content FROM messages m2 
         WHERE m2.chat_id = c.id 
         ORDER BY m2.created_at DESC LIMIT 1) AS last_message_content,
        -- O‘qilmagan xabarlar soni (sender_id != $1 bo‘lsa hisoblaymiz)
        COUNT(m.id) FILTER (WHERE m.sender_id != $1 AND m.is_read = FALSE) AS unread_count
      FROM chats c
      LEFT JOIN messages m ON m.chat_id = c.id
      WHERE c.id IN (
        SELECT m3.chat_id FROM messages m3 
        WHERE m3.sender_id = $1 OR m3.chat_id IN (
          SELECT c2.id FROM chats c2 
          WHERE c2.job_id IN (SELECT id FROM jobs WHERE client_id = $1)
          OR c2.contract_id IN (SELECT id FROM contracts WHERE freelancer_id = $1 OR client_id = $1)
        )
      )
      GROUP BY c.id
      ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
    `;

    const chatsResult = await pool.query(chatsQuery, [userId]);

    // Partner ma'lumotlarini olish (job yoki contract orqali)
    const chatsWithInfo = await Promise.all(
      chatsResult.rows.map(async (chat) => {
        let partnerId = null;
        let partnerQuery = '';

        if (chat.job_id) {
          // Job bo‘lsa client yoki freelancer ni aniqlash
          const jobResult = await pool.query(
            'SELECT client_id, freelancer_id FROM proposals p JOIN jobs j ON p.job_id = j.id WHERE j.id = $1 LIMIT 1',
            [chat.job_id]
          );
          partnerId = jobResult.rows[0]?.client_id === userId ? jobResult.rows[0]?.freelancer_id : jobResult.rows[0]?.client_id;
        } else if (chat.contract_id) {
          // Contract bo‘lsa
          const contractResult = await pool.query(
            'SELECT client_id, freelancer_id FROM contracts WHERE id = $1',
            [chat.contract_id]
          );
          partnerId = contractResult.rows[0]?.client_id === userId ? contractResult.rows[0]?.freelancer_id : contractResult.rows[0]?.client_id;
        }

        if (partnerId) {
          const partnerResult = await pool.query(
            'SELECT id, first_name, last_name, role, username FROM users WHERE id = $1',
            [partnerId]
          );
          partnerQuery = partnerResult.rows[0];
        }

        return {
          ...chat,
          partner: partnerQuery || { first_name: "Noma'lum" }
        };
      })
    );

    console.log("Chatlar natijasi (admin):", chatsResult.rows.length, "ta");

    res.json({
      success: true,
      data: { chats: chatsWithInfo }
    });
  } catch (error) {
    console.error('Get chats FULL ERROR:', error.stack);
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
      chat_id,          // majburiy
      message_text,
      type = 'text',
      file_url
    } = req.body;

    // Majburiy maydonlarni tekshirish
    if (!chat_id) {
      return res.status(400).json({
        success: false,
        message: 'chat_id majburiy (chat ochilgan bo‘lishi kerak).'
      });
    }

    if (!message_text && !file_url) {
      return res.status(400).json({
        success: false,
        message: 'Xabar matni yoki file_url kerak.'
      });
    }

    // Xabar qo‘shish — faqat mavjud maydonlarni ishlatamiz
    const result = await pool.query(
      `INSERT INTO messages (
        chat_id, sender_id,
        content, type, file_url,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [
        chat_id,
        userId,
        message_text || null,
        type,
        file_url || null
      ]
    );

    const newMessage = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Xabar yuborildi!',
      data: { message: newMessage }
    });
  } catch (error) {
    console.error('Send message FULL ERROR:', error.stack);
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


