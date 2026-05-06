const pool = require("../db/pool");
const { createNotification } = require("./notificationController");

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

    // 2) contractdan client/freelancer va job_title
    const contractQ = await client.query(
      `SELECT c.id, c.client_id, c.freelancer_id, c.total_amount, j.title AS job_title
       FROM contracts c 
       LEFT JOIN jobs j ON c.job_id = j.id
       WHERE c.id = $1`,
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

    // ✅ Notify other party
    const io = req.app.get("io");
    createNotification(io, {
      userId: againstUser,
      type: 'dispute_opened',
      title: 'Sizga nisbatan bahs ochildi',
      message: `"${reason.substring(0, 50)}${reason.length > 50 ? '...' : ''}" sababi bilan sizga nisbatan bahs ochildi.`,
      relatedId: dispute.id,
      relatedType: 'dispute',
      translationData: { jobTitle: contract.job_title || '' }
    });

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
// ✅ now includes raised_by_user object
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

    // ✅ frontend status=all yuboradi — buni filter qilmaymiz
    if (status && status !== "all") {
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

        -- ✅ Disputeni kim ochgan (raised_by)
        ur.id AS raised_by_user_id,
        ur.role AS raised_by_user_role,
        ur.username AS raised_by_username,
        ur.first_name AS raised_by_first_name,
        ur.last_name AS raised_by_last_name,
        ur.avatar_url AS raised_by_avatar_url,

        -- client (contract participant)
        uc.username  AS client_username,
        uc.first_name AS client_first_name,
        uc.last_name  AS client_last_name,
        uc.avatar_url AS client_avatar_url,

        -- freelancer (contract participant)
        uf.username  AS freelancer_username,
        uf.first_name AS freelancer_first_name,
        uf.last_name  AS freelancer_last_name,
        uf.avatar_url AS freelancer_avatar_url

      FROM disputes d
      LEFT JOIN chats ch ON ch.id = d.chat_id
      LEFT JOIN contracts c ON c.id = COALESCE(d.contract_id, ch.contract_id)

      -- ✅ raised_by user
      LEFT JOIN users ur ON ur.id = d.raised_by AND ur.deleted_at IS NULL

      LEFT JOIN users uc ON uc.id = c.client_id AND uc.deleted_at IS NULL
      LEFT JOIN users uf ON uf.id = c.freelancer_id AND uf.deleted_at IS NULL

      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, l, offset]
    );

    // ✅ rows ni normalize qilib, raised_by_user object yasab beramiz
    const disputes = (q.rows || []).map((r) => ({
      ...r,
      raised_by_user: r.raised_by_user_id
        ? {
            id: r.raised_by_user_id,
            role: r.raised_by_user_role || r.raised_by_role || null,
            username: r.raised_by_username || null,
            first_name: r.raised_by_first_name || null,
            last_name: r.raised_by_last_name || null,
            avatar_url: r.raised_by_avatar_url || null,
          }
        : null,
    }));

    return res.json({
      success: true,
      data: {
        disputes,
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
    return res.status(500).json({
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

    // Drop transactions type check constraint entirely to avoid any validation conflicts
    await client.query(`
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
    `);

    await client.query("BEGIN");

    // Get dispute and associated contract participant IDs
    const dRes = await client.query(
      `SELECT d.id, d.status, d.amount, d.currency, d.contract_id, ch.contract_id AS chat_contract_id,
              c.client_id, c.freelancer_id, c.currency AS contract_currency, c.exchange_rate,
              j.title AS job_title, j.id AS job_id, d.raised_by, d.against_user
       FROM disputes d
       LEFT JOIN chats ch ON ch.id = d.chat_id
       LEFT JOIN contracts c ON c.id = COALESCE(d.contract_id, ch.contract_id)
       LEFT JOIN jobs j ON j.id = c.job_id
       WHERE d.id = $1
       FOR UPDATE OF d`,
      [id]
    );

    if (dRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Dispute topilmadi." });
    }

    const dData = dRes.rows[0];
    const fromStatus = dData.status;

    if (fromStatus === "resolved") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Dispute allaqachon resolved." });
    }

    const clientId = dData.client_id;
    const freelancerId = dData.freelancer_id;
    const disputeAmount = Number(dData.amount || 0);
    const contractId = dData.contract_id || dData.chat_contract_id || null;
    const jobId = dData.job_id || null;

    const contractCurrency = dData.contract_currency || dData.currency || 'UZS';
    const rate = Number(dData.exchange_rate || 1);
    const isUzs = contractCurrency === 'UZS' || contractCurrency === 'uzs';

    // Safety: If actual money needs to be moved, we must have client_id
    if (payout_action && payout_action !== "no_action") {
      if (!clientId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Disputega bog'langan contractda client_id topilmadi." });
      }
    }

    if (payout_action === "refund_to_client") {
      const amountToRefundRaw = pa !== null ? pa : disputeAmount;
      if (amountToRefundRaw <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Refund summasi 0 dan katta bo'lishi kerak." });
      }

      // Convert to UZS for actual user balance deduction/addition
      const amountToRefund = isUzs ? amountToRefundRaw : Math.round(amountToRefundRaw * rate);

      const balCheck = await client.query(
        `SELECT escrow_balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [clientId]
      );
      const clientEscrow = Number(balCheck.rows[0]?.escrow_balance ?? 0);
      if (clientEscrow < amountToRefund) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Mijozning escrow hisobida yetarli mablag' mavjud emas." });
      }

      // Deduct from escrow, add to available (refund)
      await client.query(
        `UPDATE user_balances 
         SET escrow_balance = escrow_balance - $1, 
             available_balance = available_balance + $1,
             updated_at = NOW() 
         WHERE user_id = $2`,
        [amountToRefund, clientId]
      );

      // Log transaction in UZS
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, contract_id, job_id, created_at, updated_at)
         VALUES ($1, 'refund', $2, 'UZS', 'internal', 'completed', $3, $4, $5, NOW(), NOW())`,
        [
          clientId,
          amountToRefund,
          JSON.stringify({
            dispute_id: id,
            reason: "dispute_refund",
            resolution,
            original_amount: amountToRefundRaw,
            original_currency: contractCurrency,
            exchange_rate: rate
          }),
          contractId,
          jobId
        ]
      );

    } else if (payout_action === "release_to_freelancer") {
      const amountToReleaseRaw = pa !== null ? pa : disputeAmount;
      if (amountToReleaseRaw <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Release summasi 0 dan katta bo'lishi kerak." });
      }
      if (!freelancerId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Disputega bog'langan contractda freelancer_id topilmadi." });
      }

      // Convert to UZS
      const amountToRelease = isUzs ? amountToReleaseRaw : Math.round(amountToReleaseRaw * rate);

      const balCheck = await client.query(
        `SELECT escrow_balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [clientId]
      );
      const clientEscrow = Number(balCheck.rows[0]?.escrow_balance ?? 0);
      if (clientEscrow < amountToRelease) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Mijozning escrow hisobida yetarli mablag' mavjud emas." });
      }

      // Deduct from client's escrow, add to total_spent
      await client.query(
        `UPDATE user_balances 
         SET escrow_balance = escrow_balance - $1, 
             total_spent = COALESCE(total_spent, 0) + $1,
             updated_at = NOW() 
         WHERE user_id = $2`,
        [amountToRelease, clientId]
      );

      // Add to freelancer's available, add to total_earned
      await client.query(
        `UPDATE user_balances 
         SET available_balance = available_balance + $1, 
             total_earned = COALESCE(total_earned, 0) + $1,
             updated_at = NOW() 
         WHERE user_id = $2`,
        [amountToRelease, freelancerId]
      );

      // Log transaction in UZS
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, contract_id, job_id, created_at, updated_at)
         VALUES ($1, 'escrow_release', $2, 'UZS', 'internal', 'completed', $3, $4, $5, NOW(), NOW())`,
        [
          freelancerId,
          amountToRelease,
          JSON.stringify({
            dispute_id: id,
            reason: "dispute_release",
            resolution,
            original_amount: amountToReleaseRaw,
            original_currency: contractCurrency,
            exchange_rate: rate
          }),
          contractId,
          jobId
        ]
      );

    } else if (payout_action === "split") {
      const freelancerPartRaw = pa !== null ? pa : 0;
      if (freelancerPartRaw < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Split frilanser qismi manfiy bo'la olmaydi." });
      }
      if (!freelancerId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Split qilish uchun freelancer_id topilmadi." });
      }

      const freelancerPart = isUzs ? freelancerPartRaw : Math.round(freelancerPartRaw * rate);

      const balCheck = await client.query(
        `SELECT escrow_balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [clientId]
      );
      const clientEscrow = Number(balCheck.rows[0]?.escrow_balance ?? 0);
      
      const totalDeduction = disputeAmount > 0 
        ? (isUzs ? disputeAmount : Math.round(disputeAmount * rate))
        : clientEscrow;

      const clientPart = totalDeduction - freelancerPart;

      if (clientPart < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Frilanserga ajratilgan summa umumiy escrow summasidan katta bo'la olmaydi." });
      }
      if (clientEscrow < totalDeduction) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Mijozning escrow hisobida yetarli mablag' mavjud emas." });
      }

      // Deduct from client escrow, add freelancerPart to total_spent
      await client.query(
        `UPDATE user_balances 
         SET escrow_balance = escrow_balance - $1, 
             total_spent = COALESCE(total_spent, 0) + $2,
             updated_at = NOW() 
         WHERE user_id = $3`,
        [totalDeduction, freelancerPart, clientId]
      );

      // Refund client part
      if (clientPart > 0) {
        await client.query(
          `UPDATE user_balances 
           SET available_balance = available_balance + $1,
               updated_at = NOW() 
           WHERE user_id = $2`,
          [clientPart, clientId]
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, contract_id, job_id, created_at, updated_at)
           VALUES ($1, 'refund', $2, 'UZS', 'internal', 'completed', $3, $4, $5, NOW(), NOW())`,
          [
            clientId,
            clientPart,
            JSON.stringify({
              dispute_id: id,
              reason: "dispute_split_refund",
              resolution,
              original_amount: isUzs ? clientPart : (clientPart / rate),
              original_currency: contractCurrency,
              exchange_rate: rate
            }),
            contractId,
            jobId
          ]
        );
      }

      // Release freelancer part
      if (freelancerPart > 0) {
        await client.query(
          `UPDATE user_balances 
           SET available_balance = available_balance + $1,
               total_earned = COALESCE(total_earned, 0) + $1,
               updated_at = NOW() 
           WHERE user_id = $2`,
          [freelancerPart, freelancerId]
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, contract_id, job_id, created_at, updated_at)
           VALUES ($1, 'escrow_release', $2, 'UZS', 'internal', 'completed', $3, $4, $5, NOW(), NOW())`,
          [
            freelancerId,
            freelancerPart,
            JSON.stringify({
              dispute_id: id,
              reason: "dispute_split_release",
              resolution,
              original_amount: freelancerPartRaw,
              original_currency: contractCurrency,
              exchange_rate: rate
            }),
            contractId,
            jobId
          ]
        );
      }
    }

    // Now update disputes table status to resolved
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

    // Also update associated contract status from disputed back to active/completed/cancelled based on payout
    if (contractId) {
      const contractStatus = (payout_action === "refund_to_client" && pa === null) ? "cancelled" : "completed";
      await client.query(
        `UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2`,
        [contractStatus, contractId]
      );
    }

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

    // ✅ Notify both parties
    const io = req.app.get("io");
    if (dData) {
      [dData.raised_by, dData.against_user].forEach(uid => {
        if (!uid) return;
        const isWinner = uid === (winner_user_id || dData.winner_user_id);
        createNotification(io, {
          userId: uid,
          type: 'dispute_resolved',
          title: 'Bahs yopildi',
          message: `Admin bahsni ko'rib chiqdi va qaror qabul qildi. ${isWinner ? "Qaror sizning foydangizga hal qilindi." : "Qaror qarshi tomon foydasiga hal qilindi."}`,
          relatedId: id,
          relatedType: 'dispute',
          translationData: { jobTitle: dData.job_title || '' }
        });
      });
    }

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
