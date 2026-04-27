// src/controllers/messageController.js
const pool = require("../db/pool");

// ---------- helpers ----------
const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const ensureChatMemberOrAdmin = async (chatId, user) => {
  // returns chat row if allowed, else throws {status, message}
  const chatRes = await pool.query(
    `SELECT id, job_id, contract_id, status, freelancer_id
     FROM chats
     WHERE id = $1`,
    [chatId]
  );

  if (chatRes.rows.length === 0) {
    throw { status: 404, message: "Chat topilmadi" };
  }

  const chat = chatRes.rows[0];
  if (user.role === "admin") return chat;

  // if contract chat -> user must be in contract
  if (chat.contract_id) {
    const cRes = await pool.query(
      `SELECT id
       FROM contracts
       WHERE id = $1
         AND (client_id = $2 OR freelancer_id = $2)`,
      [chat.contract_id, user.id]
    );
    if (cRes.rows.length === 0) {
      throw { status: 403, message: "Siz bu chatga kira olmaysiz." };
    }
    return chat;
  }

  // if job chat -> at least client OR accepted freelancer
  if (chat.job_id) {
    const jRes = await pool.query(
      `SELECT client_id
       FROM jobs
       WHERE id = $1`,
      [chat.job_id]
    );
    if (jRes.rows.length === 0) {
      throw { status: 404, message: "Job topilmadi (chat bog'langan job yo'q)" };
    }

    const clientId = jRes.rows[0].client_id;
    if (clientId === user.id) return chat;

    const acceptedRes = await pool.query(
      `SELECT 1
       FROM proposals
       WHERE job_id = $1
         AND freelancer_id = $2
         AND status IN ('pending', 'shortlisted', 'accepted')
       LIMIT 1`,
      [chat.job_id, user.id]
    );

    if (acceptedRes.rows.length === 0) {
      throw { status: 403, message: "Siz bu chatga kira olmaysiz." };
    }
    return chat;
  }

  // neither contract_id nor job_id
  throw {
    status: 400,
    message: "Chat noto'g'ri konfiguratsiya qilingan (job_id/contract_id yo'q).",
  };
};

let getActiveSockets, getLastSeenMap;

try {
  ({ getActiveSockets, getLastSeenMap } = require("../server"));
} catch (e) {
  getActiveSockets = () => new Map();
  getLastSeenMap = () => new Map();
}

const getPartnerForChat = async (chatRow, userId) => {
  // returns {partnerUser} or null
  // priority: contract participants
  if (chatRow.contract_id) {
    const cRes = await pool.query(
      `SELECT client_id, freelancer_id
       FROM contracts
       WHERE id = $1`,
      [chatRow.contract_id]
    );
    const c = cRes.rows[0];
    if (!c) return null;

    const partnerId = c.client_id === userId ? c.freelancer_id : c.client_id;
    if (!partnerId) return null;

    const uRes = await pool.query(
      `SELECT id, first_name, last_name, role, username, avatar_url
       FROM users
       WHERE id = $1`,
      [partnerId]
    );
    const user = uRes.rows[0];
    if (!user) return null;

    // Real-time online status from Socket.io
    const activeSockets = getActiveSockets();
    const lastSeenMap = getLastSeenMap();
    const socketSet = activeSockets.get(partnerId);
    const isOnlineNow = socketSet && socketSet.size > 0;
    const lastSeenNow = isOnlineNow ? null : (lastSeenMap.get(partnerId) || null);

    console.log(`[getPartnerForChat] partnerId=${partnerId}, isOnlineNow=${isOnlineNow}, lastSeenNow=${lastSeenNow}, socketSet=${socketSet?.size}`);

    return { ...user, is_online: isOnlineNow, last_seen: lastSeenNow };
  }

  // job chat:
  if (chatRow.job_id) {
    const jRes = await pool.query(
      `SELECT client_id
       FROM jobs
       WHERE id = $1`,
      [chatRow.job_id]
    );
    const j = jRes.rows[0];
    if (!j) return null;

    // if current user is client -> partner is accepted freelancer (if exists)
    // if current user is client -> partner is accepted freelancer (if exists) OR the freelancer linked to this chat
    if (j.client_id === userId) {
      let freelancerId = chatRow.freelancer_id;

      if (!freelancerId) {
        const pRes = await pool.query(
          `SELECT freelancer_id
           FROM proposals
           WHERE job_id = $1 AND status = 'accepted'
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
           LIMIT 1`,
          [chatRow.job_id]
        );
        freelancerId = pRes.rows[0]?.freelancer_id;
      }

      if (!freelancerId) return null;

      const uRes = await pool.query(
        `SELECT id, first_name, last_name, role, username, avatar_url
         FROM users
         WHERE id = $1`,
        [freelancerId]
      );
      const user = uRes.rows[0];
      if (!user) return null;

      const activeSockets = getActiveSockets();
      const lastSeenMap = getLastSeenMap();
      const socketSet = activeSockets.get(freelancerId);
      const isOnlineNow = socketSet && socketSet.size > 0;
      const lastSeenNow = isOnlineNow ? null : (lastSeenMap.get(freelancerId) || null);

      return { ...user, is_online: isOnlineNow, last_seen: lastSeenNow };
    }

    // else partner is client
    const uRes = await pool.query(
      `SELECT id, first_name, last_name, role, username, avatar_url
       FROM users
       WHERE id = $1`,
      [j.client_id]
    );
    const user = uRes.rows[0];
    if (!user) return null;

    const activeSockets = getActiveSockets();
    const lastSeenMap = getLastSeenMap();
    const socketSet = activeSockets.get(j.client_id);
    const isOnlineNow = socketSet && socketSet.size > 0;
    const lastSeenNow = isOnlineNow ? null : (lastSeenMap.get(j.client_id) || null);

    return { ...user, is_online: isOnlineNow, last_seen: lastSeenNow };
  }

  return null;
};

// ✅ NEW: get both participants + job info
const getParticipantsForChat = async (chatRow) => {
  const empty = { client: null, freelancer: null, job: null };
  const activeSockets = getActiveSockets();
  const lastSeenMap = getLastSeenMap();

  const getOnlineStatus = (userId) => {
    const socketSet = activeSockets.get(userId);
    const isOnlineNow = socketSet && socketSet.size > 0;
    const lastSeenNow = isOnlineNow ? null : (lastSeenMap.get(userId) || null);
    return { is_online: isOnlineNow, last_seen: lastSeenNow };
  };

  // 1) Contract chat
  if (chatRow.contract_id) {
    const res = await pool.query(
      `
      SELECT
        ct.job_id,
        j.title AS job_title,

        cu.id AS client_id,
        cu.first_name AS client_first_name,
        cu.last_name AS client_last_name,
        cu.username AS client_username,
        cu.avatar_url AS client_avatar_url,

        fu.id AS freelancer_id,
        fu.first_name AS freelancer_first_name,
        fu.last_name AS freelancer_last_name,
        fu.username AS freelancer_username,
        fu.avatar_url AS freelancer_avatar_url
      FROM contracts ct
      LEFT JOIN jobs j ON j.id = ct.job_id
      JOIN users cu ON cu.id = ct.client_id
      JOIN users fu ON fu.id = ct.freelancer_id
      WHERE ct.id = $1
      LIMIT 1
      `,
      [chatRow.contract_id]
    );

    const r = res.rows[0];
    if (!r) return empty;

    const clientStatus = getOnlineStatus(r.client_id);
    const freelancerStatus = getOnlineStatus(r.freelancer_id);

    return {
      client: {
        id: r.client_id,
        first_name: r.client_first_name,
        last_name: r.client_last_name,
        username: r.client_username,
        avatar_url: r.client_avatar_url,
        role: "client",
        is_online: clientStatus.is_online,
        last_seen: clientStatus.last_seen,
      },
      freelancer: {
        id: r.freelancer_id,
        first_name: r.freelancer_first_name,
        last_name: r.freelancer_last_name,
        username: r.freelancer_username,
        avatar_url: r.freelancer_avatar_url,
        role: "freelancer",
        is_online: freelancerStatus.is_online,
        last_seen: freelancerStatus.last_seen,
      },
      job: r.job_id ? { id: r.job_id, title: r.job_title || "" } : null,
    };
  }

  // 2) Job chat
  if (chatRow.job_id) {
    const res = await pool.query(
      `
      SELECT
        j.id AS job_id,
        j.title AS job_title,

        cu.id AS client_id,
        cu.first_name AS client_first_name,
        cu.last_name AS client_last_name,
        cu.username AS client_username,
        cu.avatar_url AS client_avatar_url,

        fu.id AS freelancer_id,
        fu.first_name AS freelancer_first_name,
        fu.last_name AS freelancer_last_name,
        fu.username AS freelancer_username,
        fu.avatar_url AS freelancer_avatar_url
      FROM jobs j
      JOIN users cu ON cu.id = j.client_id
      LEFT JOIN proposals p
        ON p.job_id = j.id AND p.status = 'accepted'
      LEFT JOIN users fu ON fu.id = COALESCE($2, p.freelancer_id)
      WHERE j.id = $1
      LIMIT 1
      `,
      [chatRow.job_id, chatRow.freelancer_id]
    );

    const r = res.rows[0];
    if (!r) return empty;

    const clientStatus = getOnlineStatus(r.client_id);
    const freelancerStatus = r.freelancer_id ? getOnlineStatus(r.freelancer_id) : { is_online: false, last_seen: null };

    return {
      client: {
        id: r.client_id,
        first_name: r.client_first_name,
        last_name: r.client_last_name,
        username: r.client_username,
        avatar_url: r.client_avatar_url,
        role: "client",
        is_online: clientStatus.is_online,
        last_seen: clientStatus.last_seen,
      },
      freelancer: r.freelancer_id
        ? {
            id: r.freelancer_id,
            first_name: r.freelancer_first_name,
            last_name: r.freelancer_last_name,
            username: r.freelancer_username,
            avatar_url: r.freelancer_avatar_url,
            role: "freelancer",
            is_online: freelancerStatus.is_online,
            last_seen: freelancerStatus.last_seen,
          }
        : null,
      job: { id: r.job_id, title: r.job_title || "" },
    };
  }

  return empty;
};

// ---------- controllers ----------

/**
 * GET /messages/unread/count
 * Get total unread messages count for current user
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const query = isAdmin
      ? `
        SELECT COUNT(*)::int AS unread_count
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        WHERE m.is_read = FALSE
          AND m.deleted_at IS NULL
          AND m.sender_id <> $1
      `
      : `
        SELECT COUNT(*)::int AS unread_count
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        WHERE m.is_read = FALSE
          AND m.deleted_at IS NULL
          AND m.sender_id <> $1
          AND (
            (c.contract_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM contracts ct
              WHERE ct.id = c.contract_id
                AND (ct.client_id = $1 OR ct.freelancer_id = $1)
            ))
            OR
            (c.job_id IS NOT NULL AND (
              EXISTS (SELECT 1 FROM jobs j WHERE j.id = c.job_id AND j.client_id = $1)
              OR EXISTS (SELECT 1 FROM proposals p WHERE p.job_id = c.job_id AND p.freelancer_id = $1 AND p.status = 'accepted')
            ))
          )
      `;

    const result = await pool.query(query, [userId]);
    const unreadCount = result.rows[0]?.unread_count ?? 0;

    return res.json({
      success: true,
      data: { unread_count: unreadCount },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return res.status(500).json({
      success: false,
      message: "Xabarlar sonini olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /messages
 * Get all chats for current user
 */
const getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const chatsQuery = isAdmin
      ? `
        SELECT
          c.id AS chat_id,
          c.job_id,
          c.contract_id,
          c.freelancer_id,
          c.status,
          c.created_at AS chat_created_at,
          COALESCE((
            SELECT m.created_at
            FROM messages m
            WHERE m.chat_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
          ), c.created_at) AS last_message_at,
          (
            SELECT m.id
            FROM messages m
            WHERE m.chat_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message_id,
          (
            SELECT m.content
            FROM messages m
            WHERE m.chat_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message_content,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.chat_id = c.id
              AND m.deleted_at IS NULL
              AND m.sender_id <> $1
              AND m.is_read = FALSE
          )::int AS unread_count
        FROM chats c
        ORDER BY last_message_at DESC
      `
      : `
        SELECT
          c.id AS chat_id,
          c.job_id,
          c.contract_id,
          c.freelancer_id,
          c.status,
          c.created_at AS chat_created_at,
          COALESCE((
            SELECT m.created_at
            FROM messages m
            WHERE m.chat_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
          ), c.created_at) AS last_message_at,
          (
            SELECT m.id
            FROM messages m
            WHERE m.chat_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message_id,
          (
            SELECT m.content
            FROM messages m
            WHERE m.chat_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message_content,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.chat_id = c.id
              AND m.deleted_at IS NULL
              AND m.sender_id <> $1
              AND m.is_read = FALSE
          )::int AS unread_count
        FROM chats c
        WHERE
          (
            c.contract_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM contracts ct
              WHERE ct.id = c.contract_id
                AND (ct.client_id = $1 OR ct.freelancer_id = $1)
            )
          )
          OR
          (
            c.job_id IS NOT NULL AND (
              EXISTS (SELECT 1 FROM jobs j WHERE j.id = c.job_id AND j.client_id = $1)
              OR EXISTS (SELECT 1 FROM proposals p WHERE p.job_id = c.job_id AND p.freelancer_id = $1 AND p.status = 'accepted')
            )
          )
        ORDER BY last_message_at DESC
      `;

    const chatsResult = await pool.query(chatsQuery, [userId]);

    // attach partner info
    const chatsWithInfo = await Promise.all(
      chatsResult.rows.map(async (chat) => {
        const partner = await getPartnerForChat(chat, userId);
        return {
          ...chat,
          partner:
            partner || {
              first_name: "Noma'lum",
              last_name: "",
              username: null,
              avatar_url: null,
            },
        };
      })
    );

    return res.json({
      success: true,
      data: { chats: chatsWithInfo },
    });
  } catch (error) {
    console.error("Get chats FULL ERROR:", error.stack || error);
    return res.status(500).json({
      success: false,
      message: "Chatlarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /messages/:chatId
 * Get chat history + participants (client/freelancer) + job
 */
const getChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isUuid(chatId)) {
      return res
        .status(400)
        .json({ success: false, message: "Noto'g'ri chat ID" });
    }

    // ✅ membership check
    const chat = await ensureChatMemberOrAdmin(chatId, req.user);

    // ✅ messages (ALIAS for frontend)
    const messagesQuery = `
      SELECT 
        m.id,
        m.chat_id,
        m.sender_id,
        m.content,
        m.type,
        m.file_url,
        m.is_read,
        m.is_edited,
        m.reply_to_id,
        m.reactions,
        m.metadata,
        m.created_at,
        m.updated_at,
        m.deleted_at,

        u.first_name  AS sender_first_name,
        u.last_name   AS sender_last_name,
        u.username    AS sender_username,
        u.avatar_url  AS sender_avatar_url,
        u.role        AS sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at ASC
    `;

    const messagesResult = await pool.query(messagesQuery, [chatId]);

    await pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE chat_id = $1
         AND sender_id <> $2
         AND is_read = FALSE
         AND deleted_at IS NULL`,
      [chatId, req.user.id]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("messagesRead", { chatId });
      io.to(`user_${String(req.user.id)}`).emit("messagesRead", { chatId });
    }

    // ✅ participants
    const participants = await getParticipantsForChat(chat);

    return res.json({
      success: true,
      data: {
        messages: messagesResult.rows.map((m) => ({
          ...m,
          sender_is_admin: m.sender_role === "admin",
        })),
        chat: {
          id: chat.id,
          status: chat.status,
          job_id: chat.job_id,
          contract_id: chat.contract_id,
        },
        client: participants.client,
        freelancer: participants.freelancer,
        job: participants.job,

        // optional
        partner: await getPartnerForChat(chat, req.user.id),
      },
    });
  } catch (error) {
    const status = error?.status || 500;
    console.error("Get chat history FULL ERROR:", error.stack || error);
    return res.status(status).json({
      success: false,
      message: error?.message || "Xato yuz berdi",
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
    const { chat_id, message_text, type = "text", file_url, reply_to_id, metadata } = req.body;

    if (!chat_id || !isUuid(chat_id)) {
      return res.status(400).json({ success: false, message: "chat_id noto'g'ri" });
    }

    if (!message_text && !file_url) {
      return res.status(400).json({ success: false, message: "Xabar matni yoki file_url kerak" });
    }

    // ✅ membership + chat status
    const chat = await ensureChatMemberOrAdmin(chat_id, req.user);

    if (chat.status === "blocked" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Bu chat admin tomonidan bloklangan" });
    }

    const allowedTypes = ["text", "image", "file", "voice", "video_call", "submission", "system"];
    const safeType = allowedTypes.includes(type) ? type : "text";

    const insertRes = await pool.query(
      `INSERT INTO messages (
        chat_id,
        sender_id,
        content,
        type,
        file_url,
        reply_to_id,
        metadata,
        is_read,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())
      RETURNING *`,
      [chat_id, userId, message_text || null, safeType, file_url || null, reply_to_id || null, metadata ? JSON.stringify(metadata) : null]
    );

    const newMessage = insertRes.rows[0];

    const senderRes = await pool.query(
      `SELECT role, first_name, last_name, username, avatar_url
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const sender = senderRes.rows[0] || {};

    // ✅ keep names consistent for frontend
    const enrichedMessage = {
      ...newMessage,
      sender_role: sender.role,
      sender_first_name: sender.first_name,
      sender_last_name: sender.last_name,
      sender_username: sender.username,
      sender_avatar_url: sender.avatar_url,
      sender_is_admin: sender.role === "admin",
    };

    const io = req.app.get("io");
    if (io) {
      // 1) Chat xonasiga yuborish (o'sha xonada ochiq turganlar uchun)
      io.to(chat_id).emit("newMessage", enrichedMessage);

      // 2) Partner xonasiga yuborish (unread badge real-time o'zgarishi uchun)
      const partner = await getPartnerForChat(chat, userId);
      if (partner && partner.id) {
        const partnerRoom = `user_${String(partner.id)}`;
        io.to(partnerRoom).emit("newMessage", enrichedMessage); 

        // Tepada raqam (badge) yangilanishi uchun signal yuborish
        io.to(partnerRoom).emit("unreadUpdate", {
          chatId: chat_id,
          unreadCount: 1, 
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Xabar yuborildi!",
      data: { message: enrichedMessage },
    });
  } catch (error) {
    const status = error?.status || 500;
    console.error("Send message error:", error.stack || error);
    return res.status(status).json({
      success: false,
      message: error?.message || "Xabar yuborishda xato",
      error: status === 500 ? error.message : undefined,
    });
  }
};

/**
 * PUT /messages/read/:chatId
 * Mark messages as read
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isUuid(chatId)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri chat ID" });
    }

    await ensureChatMemberOrAdmin(chatId, req.user);

    await pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE chat_id = $1
         AND sender_id <> $2
         AND is_read = FALSE
         AND deleted_at IS NULL`,
      [chatId, req.user.id]
    );

    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("messagesRead", { chatId });
      io.to(`user_${String(req.user.id)}`).emit("messagesRead", { chatId }); // O'zimning barcha qurilmalarimga
    }

    return res.json({ success: true, message: "Xabarlar o'qilgan deb belgilandi" });
  } catch (error) {
    const status = error?.status || 500;
    console.error("Mark as read error:", error.stack || error);
    return res.status(status).json({
      success: false,
      message: error?.message || "Xatolik yuz berdi",
    });
  }
};

/**
 * POST /messages/:chatId/voice
 * Voice message: type='voice', file_url = voice_url
 */
const sendVoiceMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isUuid(chatId)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri chat ID" });
    }

    const { voice_url, reply_to_id } = req.body;
    if (!voice_url) {
      return res.status(400).json({ success: false, message: "voice_url kerak" });
    }

    const chat = await ensureChatMemberOrAdmin(chatId, req.user);
    if (chat.status === "blocked" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Bu chat admin tomonidan bloklangan" });
    }

    const insertRes = await pool.query(
      `INSERT INTO messages (chat_id, sender_id, type, file_url, reply_to_id, is_read, created_at)
       VALUES ($1, $2, 'voice', $3, $4, FALSE, NOW())
       RETURNING *`,
      [chatId, req.user.id, voice_url, reply_to_id || null]
    );

    const msg = insertRes.rows[0];

    const senderRes = await pool.query(
      `SELECT role, first_name, last_name, username, avatar_url
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const sender = senderRes.rows[0] || {};
    const enriched = {
      ...msg,
      sender_role: sender.role,
      sender_first_name: sender.first_name,
      sender_last_name: sender.last_name,
      sender_username: sender.username,
      sender_avatar_url: sender.avatar_url,
      sender_is_admin: sender.role === "admin",
    };

    const io = req.app.get("io");
    if (io) {
      // 1) Chat xonasiga
      io.to(chatId).emit("newMessage", enriched);

      // 2) Partnerga (badge uchun)
      const partner = await getPartnerForChat(chat, req.user.id);
      if (partner && partner.id) {
        const partnerRoom = `user_${String(partner.id)}`;
        io.to(partnerRoom).emit("newMessage", enriched);
        io.to(partnerRoom).emit("unreadUpdate", { chatId, unreadCount: 1 });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Ovozli xabar yuborildi!",
      data: { message: enriched },
    });
  } catch (error) {
    const status = error?.status || 500;
    console.error("Send voice message error:", error.stack || error);
    return res.status(status).json({
      success: false,
      message: error?.message || "Ovozli xabar yuborishda xato",
    });
  }
};

/**
 * POST /messages/:chatId/video-call
 * Video call: type='video_call', content = link
 */
const startVideoCall = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isUuid(chatId)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri chat ID" });
    }

    const { video_call_link } = req.body;
    if (!video_call_link) {
      return res.status(400).json({ success: false, message: "video_call_link kerak." });
    }

    const chat = await ensureChatMemberOrAdmin(chatId, req.user);
    if (chat.status === "blocked" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Bu chat admin tomonidan bloklangan" });
    }

    const insertRes = await pool.query(
      `INSERT INTO messages (chat_id, sender_id, type, content, is_read, created_at)
       VALUES ($1, $2, 'video_call', $3, FALSE, NOW())
       RETURNING *`,
      [chatId, req.user.id, video_call_link]
    );

    const msg = insertRes.rows[0];

    const io = req.app.get("io");
    if (io) io.to(chatId).emit("newMessage", msg);

    return res.status(201).json({
      success: true,
      message: "Video call boshlandi!",
      data: { message: msg },
    });
  } catch (error) {
    const status = error?.status || 500;
    console.error("Start video call error:", error.stack || error);
    return res.status(status).json({
      success: false,
      message: error?.message || "Video call boshlashda xato yuz berdi.",
    });
  }
};

/**
 * PUT /messages/:messageId
 * Edit message (only owner or admin), only text, not deleted
 */
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!isUuid(messageId)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri message ID" });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Yangi matn kiriting" });
    }

    const msgRes = await pool.query(
      `SELECT id, chat_id, sender_id, type, deleted_at
       FROM messages
       WHERE id = $1`,
      [messageId]
    );

    if (msgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Xabar topilmadi" });
    }

    const msg = msgRes.rows[0];

    if (msg.deleted_at) {
      return res.status(400).json({ success: false, message: "O'chirilgan xabarni edit qilib bo'lmaydi" });
    }

    await ensureChatMemberOrAdmin(msg.chat_id, req.user);

    const isAdmin = req.user.role === "admin";
    if (msg.sender_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: "Bu xabarni o'zgartirishga ruxsatingiz yo'q" });
    }

    if (msg.type !== "text") {
      return res.status(400).json({ success: false, message: "Faqat text xabarlarni o'zgartirish mumkin" });
    }

    const updRes = await pool.query(
      `UPDATE messages
       SET content = $1,
           updated_at = NOW(),
           is_edited = TRUE
       WHERE id = $2
       RETURNING *`,
      [content.trim(), messageId]
    );

    const updatedMessage = updRes.rows[0];

    const io = req.app.get("io");
    if (io) {
      io.to(msg.chat_id).emit("messageEdited", {
        messageId,
        content: updatedMessage.content,
        updated_at: updatedMessage.updated_at,
      });
    }

    return res.json({
      success: true,
      message: "Xabar o'zgartirildi",
      data: { message: updatedMessage },
    });
  } catch (error) {
    const status = error?.status || 500;
    console.error("Edit message error:", error.stack || error);
    return res.status(status).json({
      success: false,
      message: error?.message || "Xabarni o'zgartirishda xato",
    });
  }
};

/**
 * DELETE /messages/:messageId
 * Soft delete message (only owner or admin)
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!isUuid(messageId)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri message ID" });
    }

    const msgRes = await pool.query(
      `SELECT id, chat_id, sender_id, deleted_at
       FROM messages
       WHERE id = $1`,
      [messageId]
    );

    if (msgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Xabar topilmadi" });
    }

    const msg = msgRes.rows[0];
    if (msg.deleted_at) {
      return res.status(200).json({ success: true, message: "Xabar allaqachon o'chirilgan" });
    }

    await ensureChatMemberOrAdmin(msg.chat_id, req.user);

    const isAdmin = req.user.role === "admin";
    if (msg.sender_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: "Bu xabarni o'chirishga ruxsatingiz yo'q" });
    }

    await pool.query(
      `UPDATE messages
       SET deleted_at = NOW(),
           content = NULL,
           file_url = NULL
       WHERE id = $1`,
      [messageId]
    );

    const io = req.app.get("io");
    if (io) io.to(msg.chat_id).emit("messageDeleted", { messageId });

    return res.json({ success: true, message: "Xabar o'chirildi" });
  } catch (error) {
    const status = error?.status || 500;
    console.error("Delete message error:", error.stack || error);
    return res.status(status).json({
      success: false,
      message: error?.message || "Xabarni o'chirishda xato",
    });
  }
};

/**
 * PATCH /messages/chats/:id/status
 * Admin only (route-level authorize bor)
 */
const updateChatStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri chat ID" });
    }

    const { status } = req.body; // active | blocked
    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri status" });
    }

    const result = await pool.query(
      `UPDATE chats
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Chat topilmadi" });
    }

    const io = req.app.get("io");
    if (io) io.to(id).emit("chatStatusUpdated", { chatId: id, status });

    return res.json({ success: true, data: { chat: result.rows[0] } });
  } catch (err) {
    console.error("Chat status update error:", err.stack || err);
    return res.status(500).json({
      success: false,
      message: "Chat statusini o'zgartirishda xato",
      error: err.message,
    });
  }
};

/**
 * POST /messages/find-or-create/:proposalId
 * Find existing chat for job/freelancer or create one
 */
const findOrCreateChat = async (req, res) => {
  try {
    const { proposalId } = req.params;
    if (!isUuid(proposalId)) {
      return res.status(400).json({ success: false, message: "Proposal ID noto'g'ri" });
    }

    // 1) Proposal + Job ma'lumotlarini olish
    const pRes = await pool.query(
      `SELECT p.id, p.job_id, p.freelancer_id, j.client_id
       FROM proposals p
       JOIN jobs j ON j.id = p.job_id
       WHERE p.id = $1`,
      [proposalId]
    );

    if (pRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Taklif topilmadi" });
    }

    const { job_id, freelancer_id, client_id } = pRes.rows[0];

    // Faqat buyurtmachi yoki freelancer chatni boshlashi mumkin
    const isOwner = String(req.user.id) === String(client_id);
    const isFreelancer = String(req.user.id) === String(freelancer_id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isFreelancer && !isAdmin) {
      return res.status(403).json({ success: false, message: "Sizda ruxsat yo'q" });
    }

    // 2) Mavjud chatni qidirish (shu job va shu freelancer uchun)
    // Aslida mantiqan bitta job uchun bitta freelancer bilan bitta chat bo'lgani ma'qul
    const existingChat = await pool.query(
      `SELECT id, freelancer_id FROM chats 
       WHERE job_id = $1 AND (
         freelancer_id = $2 OR 
         contract_id IN (SELECT id FROM contracts WHERE freelancer_id = $2)
       ) LIMIT 1`,
      [job_id, freelancer_id]
    );

    if (existingChat.rows.length > 0) {
      const chatRow = existingChat.rows[0];
      // If freelancer_id is missing, update it now
      if (!chatRow.freelancer_id) {
        await pool.query(
          `UPDATE chats SET freelancer_id = $1 WHERE id = $2`,
          [freelancer_id, chatRow.id]
        );
      }
      return res.json({
        success: true,
        data: { chatId: chatRow.id }
      });
    }

    // 3) Yangi chat yaratish
    const createRes = await pool.query(
      `INSERT INTO chats (job_id, freelancer_id, status, created_at)
       VALUES ($1, $2, 'active', NOW())
       RETURNING id`,
      [job_id, freelancer_id]
    );

    return res.status(201).json({
      success: true,
      data: { chatId: createRes.rows[0].id }
    });

  } catch (error) {
    console.error("findOrCreateChat error:", error);
    return res.status(500).json({
      success: false,
      message: "Chat yaratishda xato yuz berdi",
      error: error.message
    });
  }
};

module.exports = {
  getChats,
  getChatHistory,
  getUnreadCount,
  sendMessage,
  sendVoiceMessage,
  startVideoCall,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  updateChatStatus,
  findOrCreateChat,
};
