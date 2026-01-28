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
 /**
 * GET /messages/:chatId
 * Get chat history for a specific chat
 */
/**
 * GET /messages/:chatId
 * Get chat history with real client/freelancer info
 */
const getChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!chatId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatId)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri chat ID" });
    }

    // Xabarlar tarixini olish
    const messagesQuery = `
      SELECT 
        m.id,
        m.chat_id,
        m.sender_id,
        m.content,
        m.type,
        m.file_url,
        m.is_read,
        m.created_at,
        u_sender.first_name,
        u_sender.last_name,
        u_sender.username,
        u_sender.avatar_url,
        u_sender.role AS sender_role
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at ASC
    `;

    const messagesResult = await pool.query(messagesQuery, [chatId]);

    const messagesWithInfo = messagesResult.rows.map(msg => ({
      ...msg,
      sender_is_admin: msg.sender_role === 'admin'
    }));

    if (isAdmin) {
      await pool.query(
        'UPDATE messages SET is_read = TRUE WHERE chat_id = $1 AND sender_id != $2 AND is_read = FALSE',
        [chatId, userId]
      );
    }

    // Client va freelancer ma'lumotlarini aniqlash
    let client = null;
    let freelancer = null;

    const chatQuery = await pool.query('SELECT job_id, contract_id FROM chats WHERE id = $1', [chatId]);
    const chat = chatQuery.rows[0];

    if (chat) {
      // 1. Agar contract_id bo‘lsa — undan client va freelancer ni olamiz (eng to‘g‘ri yo‘l)
      if (chat.contract_id) {
        const contractQuery = await pool.query(
          'SELECT client_id, freelancer_id FROM contracts WHERE id = $1',
          [chat.contract_id]
        );
        const contract = contractQuery.rows[0];
        if (contract) {
          if (contract.client_id) {
            client = (await pool.query(
              'SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = $1',
              [contract.client_id]
            )).rows[0];
          }
          if (contract.freelancer_id) {
            freelancer = (await pool.query(
              'SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = $1',
              [contract.freelancer_id]
            )).rows[0];
          }
        }
      }

      // 2. Agar job_id bo‘lsa va contract bo‘lmasa — faqat client ni olamiz (freelancer hali tanlanmagan)
      else if (chat.job_id) {
        const jobQuery = await pool.query('SELECT client_id FROM jobs WHERE id = $1', [chat.job_id]);
        const job = jobQuery.rows[0];
        if (job?.client_id) {
          client = (await pool.query(
            'SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = $1',
            [job.client_id]
          )).rows[0];
        }
      }
    }

    res.json({
      success: true,
      data: {
        messages: messagesWithInfo,
        is_admin: isAdmin,
        client,
        freelancer
      }
    });
  } catch (error) {
    console.error('Get chat history FULL ERROR:', error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /messages
 * Send a message
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // 'client', 'freelancer', 'admin'

    const {
      chat_id,
      message_text,
      type = 'text',
      file_url
    } = req.body;

    // Validatsiya
    if (!chat_id) {
      return res.status(400).json({
        success: false,
        message: 'chat_id majburiy'
      });
    }

    if (!message_text && !file_url) {
      return res.status(400).json({
        success: false,
        message: 'Xabar matni yoki file_url kerak'
      });
    }

    // ✅ 1) CHAT STATUS TEKSHIRISH (BLOCKED BO'LSA STOP)
    const chat = await pool.query(
      "SELECT id, status FROM chats WHERE id = $1",
      [chat_id]
    );

    if (chat.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat topilmadi"
      });
    }

    if (chat.rows[0]?.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Bu chat admin tomonidan bloklangan"
      });
    }

    // Xabar qo'shish
    const result = await pool.query(
      `INSERT INTO messages (
        chat_id, 
        sender_id,
        content, 
        type, 
        file_url,
        is_read,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        chat_id,
        userId,
        message_text || null,
        type,
        file_url || null,
        false
      ]
    );

    const newMessage = result.rows[0];

    // Sender ma'lumotlarini qo'shish (Socket.io uchun)
    const userResult = await pool.query(
      `SELECT role, first_name, last_name, username, avatar_url 
       FROM users WHERE id = $1`,
      [userId]
    );

    const enrichedMessage = {
      ...newMessage,
      sender_role: userRole,
      sender_first_name: userResult.rows[0]?.first_name,
      sender_last_name: userResult.rows[0]?.last_name,
      sender_username: userResult.rows[0]?.username,
      sender_avatar: userResult.rows[0]?.avatar_url
    };

    // Socket.io orqali real-time yuborish
    const io = req.app.get('io');
    if (io) {
      io.to(chat_id).emit('newMessage', enrichedMessage);
    }

    res.status(201).json({
      success: true,
      message: 'Xabar yuborildi!',
      data: { message: enrichedMessage }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Xabar yuborishda xato',
      error: error.message
    });
  }
};

/**
 * PUT /messages/:chatId/read
 * Xabarlarni o'qilgan deb belgilash
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    await pool.query(
      `UPDATE messages 
       SET is_read = true 
       WHERE chat_id = $1 
       AND sender_id != $2 
       AND is_read = false`,
      [chatId, userId]
    );

    // Socket.io orqali xabar yuborish
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('messagesRead', { chatId });
    }

    res.json({
      success: true,
      message: 'Xabarlar o\'qilgan deb belgilandi'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Xatolik yuz berdi',
      error: error.message
    });
  }
};

/**
 * POST /messages/:chatId/voice
 * Ovozli xabar yuborish
 */
const sendVoiceMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { voice_url } = req.body;

    if (!voice_url) {
      return res.status(400).json({
        success: false,
        message: 'Voice URL kerak'
      });
    }

    const result = await pool.query(
      `INSERT INTO messages (
        chat_id, 
        sender_id,
        type, 
        file_url,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [chatId, userId, 'voice', voice_url]
    );

    const newMessage = result.rows[0];

    // Sender info
    const userResult = await pool.query(
      `SELECT role, first_name, last_name, username, avatar_url 
       FROM users WHERE id = $1`,
      [userId]
    );
    
    const enrichedMessage = {
      ...newMessage,
      sender_role: userRole,
      sender_first_name: userResult.rows[0]?.first_name,
      sender_last_name: userResult.rows[0]?.last_name,
      sender_username: userResult.rows[0]?.username,
      sender_avatar: userResult.rows[0]?.avatar_url
    };

    // Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('newMessage', enrichedMessage);
    }

    res.status(201).json({
      success: true,
      message: 'Ovozli xabar yuborildi!',
      data: { message: enrichedMessage }
    });
  } catch (error) {
    console.error('Send voice message error:', error);
    res.status(500).json({
      success: false,
      message: 'Ovozli xabar yuborishda xato',
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


const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Yangi matn kiriting'
      });
    }

    // Xabarni topish
    const messageQuery = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Xabar topilmadi'
      });
    }

    const message = messageQuery.rows[0];

    // Ruxsat tekshirish (faqat o'z xabarini yoki admin)
    if (message.sender_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu xabarni o\'zgartirishga ruxsatingiz yo\'q'
      });
    }

    // Faqat text xabarlarni edit qilish mumkin
    if (message.type !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Faqat text xabarlarni o\'zgartirish mumkin'
      });
    }

    // Update
    const result = await pool.query(
      `UPDATE messages 
       SET content = $1, 
           updated_at = NOW(),
           is_edited = TRUE
       WHERE id = $2
       RETURNING *`,
      [content.trim(), messageId]
    );

    const updatedMessage = result.rows[0];

    // Socket.io orqali yuborish
    const io = req.app.get('io');
    if (io) {
      io.to(message.chat_id).emit('messageEdited', {
        messageId,
        content: content.trim(),
        updated_at: updatedMessage.updated_at
      });
    }

    res.json({
      success: true,
      message: 'Xabar o\'zgartirildi',
      data: { message: updatedMessage }
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Xabarni o\'zgartirishda xato',
      error: error.message
    });
  }
};

/**
 * DELETE /messages/:messageId
 * Delete message (soft delete)
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Xabarni topish
    const messageQuery = await pool.query(
      'SELECT * FROM messages WHERE id = $1 AND deleted_at IS NULL',
      [messageId]
    );

    if (messageQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Xabar topilmadi yoki allaqachon o\'chirilgan'
      });
    }

    const message = messageQuery.rows[0];

    // Ruxsat tekshirish (faqat o'z xabarini yoki admin)
    if (message.sender_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu xabarni o\'chirishga ruxsatingiz yo\'q'
      });
    }

    // Soft delete
    await pool.query(
      `UPDATE messages 
       SET deleted_at = NOW(),
           content = NULL,
           file_url = NULL
       WHERE id = $1`,
      [messageId]
    );

    // Socket.io orqali yuborish
    const io = req.app.get('io');
    if (io) {
      io.to(message.chat_id).emit('messageDeleted', {
        messageId
      });
    }

    res.json({
      success: true,
      message: 'Xabar o\'chirildi'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Xabarni o\'chirishda xato',
      error: error.message
    });
  }
};

// PATCH /admin/chats/:id/status
const updateChatStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // active | blocked

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Noto‘g‘ri status"
      });
    }

    const result = await pool.query(
      `UPDATE chats
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat topilmadi"
      });
    }

    res.json({
      success: true,
      data: { chat: result.rows[0] }
    });
  } catch (err) {
    console.error("Chat status update error:", err);
    res.status(500).json({
      success: false,
      message: "Chat statusini o‘zgartirishda xato"
    });
  }
};


module.exports = {
  getChats,
  getChatHistory,
  sendMessage,
  sendVoiceMessage,
  startVideoCall,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  updateChatStatus
};


