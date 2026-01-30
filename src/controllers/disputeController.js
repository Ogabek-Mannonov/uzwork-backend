const pool = require("../db/pool");

// helper: role normalize
const normalizeRole = (r) => String(r || "").toLowerCase();

// =========================
// POST /disputes
// Body: { chat_id, reason, evidence_files?: [], amount?: number, currency?: "UZS" }
// contract_id ni chatdan olamiz
// against_user ni contractdan topamiz
// =========================
const createDispute = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = normalizeRole(req.user?.role);

    // disputes_raised_by_role_check -> faqat client/freelancer bo‘lsin
    if (!["client", "freelancer"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Dispute faqat client yoki freelancer tomonidan ochiladi.",
      });
    }

    const { chat_id, reason, evidence_files = [], amount, currency } = req.body;

    if (!chat_id || !reason) {
      return res.status(400).json({
        success: false,
        message: "chat_id va reason majburiy.",
      });
    }

    // 1) chatni topamiz: contract_id, job_id
    const chatQ = await pool.query(
      `SELECT id, contract_id, job_id
       FROM chats
       WHERE id = $1`,
      [chat_id]
    );

    if (chatQ.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Chat topilmadi." });
    }

    const chat = chatQ.rows[0];
    const contractId = chat.contract_id;

    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: "Bu chat contractga ulangan emas (chats.contract_id NULL).",
      });
    }

    // 2) contractdan client/freelancer ni olamiz
    const contractQ = await pool.query(
      `SELECT id, client_id, freelancer_id, total_amount
       FROM contracts
       WHERE id = $1`,
      [contractId]
    );

    if (contractQ.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Contract topilmadi." });
    }

    const contract = contractQ.rows[0];

    // 3) bu user shu contract ishtirokchisimi?
    const isParticipant =
      String(contract.client_id) === String(userId) ||
      String(contract.freelancer_id) === String(userId);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Siz bu chat/contract ishtirokchisi emassiz.",
      });
    }

    // 4) against_user aniqlaymiz
    const againstUser =
      role === "client" ? contract.freelancer_id : contract.client_id;

    // amount/currency: agar yuborilmasa contract.total_amount dan olamiz (amount bigint bo‘lgani uchun yaxlitlaymiz)
    const finalCurrency = currency || "UZS";
    const finalAmount =
      amount != null
        ? Number(amount)
        : contract.total_amount != null
        ? Math.round(Number(contract.total_amount))
        : null;

    // evidence_files jsonb
    const evidenceJson =
      Array.isArray(evidence_files) ? evidence_files : [];

    const ins = await pool.query(
      `INSERT INTO disputes (
        raised_by,
        raised_by_role,
        against_user,
        chat_id,
        contract_id,
        reason,
        evidence_files,
        status,
        amount,
        currency,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,$9,NOW(),NOW())
      RETURNING *`,
      [
        userId,
        role,
        againstUser,
        chat_id,
        contractId,
        reason,
        JSON.stringify(evidenceJson),
        finalAmount,
        finalCurrency,
      ]
    );

    return res.status(201).json({
      success: true,
      data: { dispute: ins.rows[0] },
    });
  } catch (error) {
    console.error("Create dispute error:", error);
    return res.status(500).json({
      success: false,
      message: "Nizo yaratishda xato.",
      error: error.message,
    });
  }
};

// =========================
// GET /disputes (admin list)
// Query: status, page, limit
// =========================
const getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    let where = "WHERE 1=1";
    const params = [];
    let i = 1;

    if (status) {
      where += ` AND d.status = $${i++}`;
      params.push(status);
    }

    // client/freelancer ni contractdan olamiz
    const q = await pool.query(
      `
      SELECT
        d.*,
        ch.job_id,
        c.client_id,
        c.freelancer_id,

        uc.username  AS client_username,
        uc.first_name AS client_first_name,
        uc.last_name  AS client_last_name,
        uc.avatar_url AS client_avatar_url,

        uf.username  AS freelancer_username,
        uf.first_name AS freelancer_first_name,
        uf.last_name  AS freelancer_last_name,
        uf.avatar_url AS freelancer_avatar_url

      FROM disputes d
      LEFT JOIN chats ch ON ch.id = d.chat_id
      LEFT JOIN contracts c ON c.id = COALESCE(d.contract_id, ch.contract_id)

      LEFT JOIN users uc ON uc.id = c.client_id AND uc.deleted_at IS NULL
      LEFT JOIN users uf ON uf.id = c.freelancer_id AND uf.deleted_at IS NULL

      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, l, offset]
    );

    res.json({
      success: true,
      data: {
        disputes: q.rows,
        page: p,
        limit: l,
      },
    });
  } catch (error) {
    console.error("Get disputes error:", error);
    res.status(500).json({
      success: false,
      message: "Nizolarni olishda xato.",
      error: error.message,
    });
  }
};

// =========================
// GET /disputes/my (client/freelancer)
// =========================
const getMyDisputes = async (req, res) => {
  try {
    const userId = req.user?.id;

    const q = await pool.query(
      `
      SELECT d.*
      FROM disputes d
      WHERE d.raised_by = $1
      ORDER BY d.created_at DESC
      `,
      [userId]
    );

    res.json({ success: true, data: { disputes: q.rows } });
  } catch (error) {
    console.error("Get my disputes error:", error);
    res.status(500).json({
      success: false,
      message: "Nizolarni olishda xato.",
      error: error.message,
    });
  }
};

// =========================
// GET /disputes/:id (admin detail)
// Return: dispute + client + freelancer + last 30 messages + milestones
// =========================
const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) dispute + chat + contract + users
    const dQ = await pool.query(
      `
      SELECT
        d.*,
        ch.job_id,
        ch.contract_id AS chat_contract_id,

        c.client_id,
        c.freelancer_id,

        uc.id AS client_id_full,
        uc.username AS client_username,
        uc.first_name AS client_first_name,
        uc.last_name AS client_last_name,
        uc.avatar_url AS client_avatar_url,

        uf.id AS freelancer_id_full,
        uf.username AS freelancer_username,
        uf.first_name AS freelancer_first_name,
        uf.last_name AS freelancer_last_name,
        uf.avatar_url AS freelancer_avatar_url

      FROM disputes d
      LEFT JOIN chats ch ON ch.id = d.chat_id
      LEFT JOIN contracts c ON c.id = COALESCE(d.contract_id, ch.contract_id)
      LEFT JOIN users uc ON uc.id = c.client_id AND uc.deleted_at IS NULL
      LEFT JOIN users uf ON uf.id = c.freelancer_id AND uf.deleted_at IS NULL
      WHERE d.id = $1
      `,
      [id]
    );

    if (dQ.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Dispute topilmadi." });
    }

    const row = dQ.rows[0];

    const contractId = row.contract_id || row.chat_contract_id || null;
    const chatId = row.chat_id;

    // 2) last 30 messages (deleted_at IS NULL)
    let chatHistory = [];
    if (chatId) {
      const mQ = await pool.query(
        `
        SELECT
          m.id,
          m.chat_id,
          m.sender_id,
          m.sender_role,
          m.content,
          m.type,
          m.file_url,
          m.is_read,
          m.is_edited,
          m.created_at,
          m.updated_at,
          u.username AS sender_username,
          u.first_name AS sender_first_name,
          u.last_name AS sender_last_name,
          u.avatar_url AS sender_avatar_url
        FROM messages m
        LEFT JOIN users u ON u.id = m.sender_id AND u.deleted_at IS NULL
        WHERE m.chat_id = $1
          AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 30
        `,
        [chatId]
      );

      // UI uchun odatda eski->yangi ko‘rsatamiz:
      chatHistory = (mQ.rows || []).reverse();
    }

    // 3) milestones by contract_id
    let milestones = [];
    if (contractId) {
      const msQ = await pool.query(
        `
        SELECT id, contract_id, title, amount, status, submitted_at, approved_at, created_at
        FROM milestones
        WHERE contract_id = $1
        ORDER BY created_at ASC
        `,
        [contractId]
      );
      milestones = msQ.rows || [];
    }

    // client/freelancer obj
    const client = row.client_id_full
      ? {
          id: row.client_id_full,
          username: row.client_username,
          first_name: row.client_first_name,
          last_name: row.client_last_name,
          avatar_url: row.client_avatar_url,
        }
      : null;

    const freelancer = row.freelancer_id_full
      ? {
          id: row.freelancer_id_full,
          username: row.freelancer_username,
          first_name: row.freelancer_first_name,
          last_name: row.freelancer_last_name,
          avatar_url: row.freelancer_avatar_url,
        }
      : null;

    // dispute payload (row ichidagi join fieldlarni tozalab)
    const dispute = {
      id: row.id,
      chat_id: row.chat_id,
      contract_id: contractId,
      job_id: row.job_id || null,

      raised_by: row.raised_by,
      raised_by_role: row.raised_by_role,
      against_user: row.against_user,

      reason: row.reason,
      evidence_files: row.evidence_files || [],
      status: row.status,

      amount: row.amount,
      currency: row.currency,

      resolution: row.resolution,
      admin_notes: row.admin_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved_at: row.resolved_at,

      client,
      freelancer,
      chatHistory,
      milestones,
    };

    return res.json({ success: true, data: { dispute } });
  } catch (error) {
    console.error("Get dispute by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Dispute detailni olishda xato.",
      error: error.message,
    });
  }
};

// =========================
// PATCH /disputes/:id/status  (admin)
// allowed: open, in_review, resolved
// =========================
const updateDisputeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["open", "in_review", "resolved"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Status noto'g'ri." });
    }

    const q = await pool.query(
      `
      UPDATE disputes
      SET status = $1,
          resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Dispute topilmadi." });
    }

    res.json({ success: true, data: { dispute: q.rows[0] } });
  } catch (error) {
    console.error("Update dispute status error:", error);
    res.status(500).json({
      success: false,
      message: "Status yangilashda xato.",
      error: error.message,
    });
  }
};

// =========================
// POST /disputes/:id/resolve (admin)
// Body: { resolution: "approved"|"rejected", admin_notes?: string }
// status=resolved bo‘ladi
// =========================
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, admin_notes } = req.body;

    const allowed = ["approved", "rejected"];
    if (!allowed.includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: "resolution 'approved' yoki 'rejected' bo‘lishi kerak.",
      });
    }

    const q = await pool.query(
      `
      UPDATE disputes
      SET status = 'resolved',
          resolution = $1,
          admin_notes = $2,
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [resolution, admin_notes || null, id]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Dispute topilmadi." });
    }

    res.json({ success: true, data: { dispute: q.rows[0] } });
  } catch (error) {
    console.error("Resolve dispute error:", error);
    res.status(500).json({
      success: false,
      message: "Resolve qilishda xato.",
      error: error.message,
    });
  }
};

module.exports = {
  createDispute,
  getDisputes,
  getMyDisputes,
  getDisputeById,
  updateDisputeStatus,
  resolveDispute,
};
