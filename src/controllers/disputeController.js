const pool = require("../db/pool");

// helper: role normalize
const normalizeRole = (r) => String(r || "").toLowerCase();

const safeJsonArray = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const logDisputeAction = async (client, { dispute_id, actor_id, action, meta, from_status, to_status }) => {
  // dispute_actions: dispute_id NOT NULL, actor_id NOT NULL, meta NOT NULL DEFAULT {}
  await client.query(
    `
    INSERT INTO dispute_actions (dispute_id, actor_id, action, meta, from_status, to_status, created_at)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())
    `,
    [
      dispute_id,
      actor_id,
      action,
      JSON.stringify(meta || {}),
      from_status || null,
      to_status || null,
    ]
  );
};

// =========================
// POST /disputes
// Body: { chat_id, reason, evidence_files?: [], amount?: number, currency?: "UZS" }
// =========================
const createDispute = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const role = normalizeRole(req.user?.role);

    if (!["client", "freelancer"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Dispute faqat client yoki freelancer tomonidan ochiladi.",
      });
    }

    const { chat_id, reason, evidence_files, amount, currency } = req.body;

    if (!chat_id || !reason) {
      return res.status(400).json({
        success: false,
        message: "chat_id va reason majburiy.",
      });
    }

    await client.query("BEGIN");

    // 1) chatni topamiz
    const chatQ = await client.query(
      `SELECT id, contract_id, job_id FROM chats WHERE id = $1`,
      [chat_id]
    );
    if (chatQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Chat topilmadi." });
    }

    const contractId = chatQ.rows[0].contract_id;
    if (!contractId) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Bu chat contractga ulangan emas (chats.contract_id NULL).",
      });
    }

    // 2) contractdan client/freelancer
    const contractQ = await client.query(
      `SELECT id, client_id, freelancer_id, total_amount FROM contracts WHERE id = $1`,
      [contractId]
    );
    if (contractQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Contract topilmadi." });
    }

    const contract = contractQ.rows[0];

    const isParticipant =
      String(contract.client_id) === String(userId) ||
      String(contract.freelancer_id) === String(userId);

    if (!isParticipant) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "Siz bu chat/contract ishtirokchisi emassiz.",
      });
    }

    const againstUser = role === "client" ? contract.freelancer_id : contract.client_id;

    // amount/currency
    const finalCurrency = (currency && String(currency).trim()) ? String(currency).trim() : "UZS";
    const finalAmount =
      amount != null
        ? Number(amount)
        : contract.total_amount != null
        ? Math.round(Number(contract.total_amount))
        : null;

    if (finalAmount != null && (!Number.isFinite(finalAmount) || finalAmount <= 0)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "amount noto'g'ri." });
    }

    const evidenceArr = safeJsonArray(evidence_files);

    // ✅ Insert (unique partial index contract bo'yicha bitta aktiv dispute ushlab qoladi)
    const ins = await client.query(
      `
      INSERT INTO disputes (
        raised_by, raised_by_role, against_user,
        chat_id, contract_id,
        reason, evidence_files,
        status, amount, currency,
        created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'open',$8,$9,NOW(),NOW())
      RETURNING *
      `,
      [
        userId,
        role,
        againstUser,
        chat_id,
        contractId,
        reason,
        JSON.stringify(evidenceArr),
        finalAmount,
        finalCurrency,
      ]
    );

    const dispute = ins.rows[0];

    // audit log
    await logDisputeAction(client, {
      dispute_id: dispute.id,
      actor_id: userId,
      action: "status_changed", // yoki "opened" deb kengaytirasiz (check constraintga qarab)
      meta: { reason: "dispute_created" },
      from_status: null,
      to_status: "open",
    });

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: { dispute },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // unique violation => allaqachon open/in_review dispute bor
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Bu contract uchun dispute allaqachon ochilgan (active).",
      });
    }

    console.error("Create dispute error:", error);
    return res.status(500).json({
      success: false,
      message: "Nizo yaratishda xato.",
      error: error.message,
    });
  } finally {
    client.release();
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

    const countQ = await pool.query(
      `SELECT COUNT(*)::int AS c FROM disputes d ${where}`,
      params
    );
    const total = countQ.rows[0]?.c ?? 0;

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
        pagination: {
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l),
        },
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
// ✅ (keyin pagination qo'shasiz)
// =========================
const getMyDisputes = async (req, res) => {
  try {
    const userId = req.user?.id;

    const q = await pool.query(
      `
      SELECT d.*
      FROM disputes d
      WHERE d.raised_by = $1 OR d.against_user = $1
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
// ✅ endi dispute_actions timeline ham qo'shamiz
// =========================
const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;

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

    let chatHistory = [];
    if (chatId) {
      const mQ = await pool.query(
        `
        SELECT
          m.id,
          m.chat_id,
          m.sender_id,
          u.role AS sender_role,
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
      chatHistory = (mQ.rows || []).reverse();
    }

    let milestones = [];
    if (contractId) {
      const msQ = await pool.query(
        `
        SELECT id, contract_id, title, amount, status, created_at, approved_at
        FROM milestones
        WHERE contract_id = $1
        ORDER BY created_at ASC
        `,
        [contractId]
      );
      milestones = msQ.rows || [];
    }

    // ✅ actions timeline
    const aQ = await pool.query(
      `
      SELECT
        a.id, a.dispute_id, a.actor_id, a.action, a.meta, a.from_status, a.to_status, a.created_at,
        u.username AS actor_username,
        u.first_name AS actor_first_name,
        u.last_name  AS actor_last_name,
        u.avatar_url AS actor_avatar_url,
        u.role       AS actor_role
      FROM dispute_actions a
      LEFT JOIN users u ON u.id = a.actor_id AND u.deleted_at IS NULL
      WHERE a.dispute_id = $1
      ORDER BY a.created_at ASC
      `,
      [id]
    );

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

    const dispute = {
      ...row,
      contract_id: contractId,
      job_id: row.job_id || null,
      evidence_files: safeJsonArray(row.evidence_files),
      client,
      freelancer,
      chatHistory,
      milestones,
      actions: aQ.rows || [],
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
// ✅ resolved endi bu endpointdan bo'lmaydi
// Body: { status: "open"|"in_review" }
// =========================
const updateDisputeStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const adminId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["open", "in_review"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status faqat 'open' yoki 'in_review' bo'lishi mumkin.",
      });
    }

    await client.query("BEGIN");

    const curQ = await client.query(`SELECT id, status FROM disputes WHERE id = $1`, [id]);
    if (curQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Dispute topilmadi." });
    }

    const fromStatus = curQ.rows[0].status;

    const q = await client.query(
      `
      UPDATE disputes
      SET status = $1::varchar,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    await logDisputeAction(client, {
      dispute_id: id,
      actor_id: adminId,
      action: "status_changed",
      meta: { by: "admin" },
      from_status: fromStatus,
      to_status: status,
    });

    await client.query("COMMIT");

    res.json({ success: true, data: { dispute: q.rows[0] } });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update dispute status error:", error);
    res.status(500).json({
      success: false,
      message: "Status yangilashda xato.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// =========================
// POST /disputes/:id/resolve (admin)
// Body: {
//   resolution: "approved"|"rejected",
//   admin_notes?: string,
//   payout_action?: "refund_to_client"|"release_to_freelancer"|"split"|"no_action",
//   payout_amount?: number,
//   payout_currency?: "UZS",
//   winner_user_id?: uuid
// }
// =========================
const resolveDispute = async (req, res) => {
  const client = await pool.connect();
  try {
    const adminId = req.user?.id;
    const { id } = req.params;

    const {
      resolution, // approved/rejected (legacy)
      admin_notes,
      payout_action,
      payout_amount,
      payout_currency,
      winner_user_id,
    } = req.body;

    const allowedResolution = ["approved", "rejected"];
    if (!allowedResolution.includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: "resolution 'approved' yoki 'rejected' bo‘lishi kerak.",
      });
    }

    const allowedActions = ["refund_to_client", "release_to_freelancer", "split", "no_action", null, undefined];
    if (!allowedActions.includes(payout_action)) {
      return res.status(400).json({
        success: false,
        message: "payout_action noto'g'ri.",
      });
    }

    const pa =
      payout_amount == null ? null : Number(payout_amount);

    if (pa != null && (!Number.isFinite(pa) || pa <= 0)) {
      return res.status(400).json({ success: false, message: "payout_amount noto'g'ri." });
    }

    const pc =
      payout_currency == null ? null : String(payout_currency).trim();

    await client.query("BEGIN");

    const curQ = await client.query(
      `SELECT id, status FROM disputes WHERE id = $1`,
      [id]
    );
    if (curQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Dispute topilmadi." });
    }

    const fromStatus = curQ.rows[0].status;
    if (fromStatus === "resolved") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Dispute allaqachon resolved." });
    }

    const q = await client.query(
      `
      UPDATE disputes
      SET status = 'resolved',
          resolution = $1,
          admin_notes = $2,
          resolved_at = NOW(),
          updated_at = NOW(),
          resolved_by = $3,
          winner_user_id = $4,
          payout_action = $5,
          payout_amount = $6,
          payout_currency = COALESCE($7, payout_currency, currency)
      WHERE id = $8
      RETURNING *
      `,
      [
        resolution,
        admin_notes || null,
        adminId,
        winner_user_id || null,
        payout_action || null,
        pa,
        pc,
        id,
      ]
    );

    await logDisputeAction(client, {
      dispute_id: id,
      actor_id: adminId,
      action: resolution === "approved" ? "approved" : "rejected",
      meta: {
        admin_notes: admin_notes || null,
        payout_action: payout_action || null,
        payout_amount: pa,
        payout_currency: pc || null,
        winner_user_id: winner_user_id || null,
      },
      from_status: fromStatus,
      to_status: "resolved",
    });

    await client.query("COMMIT");

    res.json({ success: true, data: { dispute: q.rows[0] } });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Resolve dispute error:", error);
    res.status(500).json({
      success: false,
      message: "Resolve qilishda xato.",
      error: error.message,
    });
  } finally {
    client.release();
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
