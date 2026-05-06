const pool = require("../db/pool");

// Currency handling helpers are imported from services as needed

/**
 * POST /proposals
 * Create a new proposal (only freelancers can create)
 */
const {
  ensureBalanceRow,
  lockFromAvailableToLocked,
  refundLockedToAvailable,
  consumeLockedToPlatform,
} = require("../services/walletService");

const { createNotification } = require("../controllers/notificationController");

const normalizeStatus = (s) => (s ? String(s).toLowerCase() : null);

const DEPOSIT_AMOUNT = Number(process.env.PROPOSAL_DEPOSIT_AMOUNT || 0);
const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID;

// =========================
// POST /proposals
// Create proposal + LOCK deposit (wallet)
// =========================
const createProposal = async (req, res) => {
  const client = await pool.connect();
  const io = req.app.get("io");
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const freelancerName = `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() || "Freelancer";

    if (userRole !== "freelancer") {
      return res.status(403).json({
        success: false,
        message: "proposals.error.freelancerOnly",
      });
    }

    const { job_id, cover_letter, proposed_price, proposed_duration, currency, milestones = [], files = [] } = req.body;

    if (!job_id || !cover_letter || proposed_price == null || proposed_duration == null) {
      return res.status(400).json({
        success: false,
        message: "proposals.error.missingFields",
      });
    }

    await client.query("BEGIN");

    // Job mavjudmi + openmi + deleted emasmi (LOCK emas, lekin ok)
    const jobCheck = await client.query(
      "SELECT id, client_id, title, status, deleted_at, currency FROM jobs WHERE id = $1",
      [job_id]
    );

    if (jobCheck.rows.length === 0 || jobCheck.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "job.error.notFound" });
    }

    const job = jobCheck.rows[0];
    const jobCurrency = job.currency || 'UZS';
    const finalCurrency = currency || jobCurrency;

    if (job.client_id === userId) {
      return res.status(400).json({
        success: false,
        message: "proposals.error.ownJob",
      });
    }

    if (normalizeStatus(job.status) !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "proposals.error.jobNotOpen",
      });
    }

    // allaqachon yuborganmi (LOCK uchun FOR UPDATE qilamiz)
    const existing = await client.query(
      "SELECT id, status FROM proposals WHERE job_id = $1 AND freelancer_id = $2 FOR UPDATE",
      [job_id, userId]
    );

    let proposal;
    if (existing.rows.length > 0) {
      const existingProposal = existing.rows[0];
      
      // Agar taklif 'invited' (taklif qilingan) bo'lsa, uni yangilashga ruxsat beramiz
      if (existingProposal.status === 'invited') {
        const updateResult = await client.query(
          `UPDATE proposals SET 
            cover_letter = $1,
            proposed_price = $2,
            proposed_duration = $3,
            status = 'pending',
            deposit_amount = $4,
            deposit_status = $5,
            deposit_locked_at = $6,
            milestones = $7,
            files = $8,
            is_invitation = FALSE,
            currency = $9,
            updated_at = NOW()
          WHERE id = $10
          RETURNING *`,
          [
            cover_letter,
            proposed_price,
            proposed_duration,
            DEPOSIT_AMOUNT > 0 ? DEPOSIT_AMOUNT : 0,
            DEPOSIT_AMOUNT > 0 ? "locked" : "none",
            DEPOSIT_AMOUNT > 0 ? new Date() : null,
            JSON.stringify(milestones),
            JSON.stringify(files),
            finalCurrency,
            existingProposal.id
          ]
        );
        proposal = updateResult.rows[0];
      } else {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "proposals.error.alreadySubmitted",
        });
      }
    } else {
      // 1) Yangi Proposal insert (pending)
      const result = await client.query(
        `INSERT INTO proposals (
          job_id, freelancer_id, cover_letter,
          proposed_price, proposed_duration,
          status,
          deposit_amount, deposit_status, deposit_locked_at,
          milestones, files, currency
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          job_id,
          userId,
          cover_letter,
          proposed_price,
          proposed_duration,
          DEPOSIT_AMOUNT > 0 ? DEPOSIT_AMOUNT : 0,
          DEPOSIT_AMOUNT > 0 ? "locked" : "none",
          DEPOSIT_AMOUNT > 0 ? new Date() : null,
          JSON.stringify(milestones),
          JSON.stringify(files),
          finalCurrency
        ]
      );
      proposal = result.rows[0];
    }

    // 2) Deposit lock (available -> locked)
    if (DEPOSIT_AMOUNT > 0) {
      const idemKey = `proposal_lock:${proposal.id}`;
      await lockFromAvailableToLocked(client, {
        userId,
        amount: DEPOSIT_AMOUNT,
        currency: "UZS",
        meta: { proposal_id: String(proposal.id), job_id: String(job_id), reason: "proposal_deposit_lock" },
        idempotencyKey: idemKey,
      });
    }

    await client.query("COMMIT");

    // 3) Notify client (background) - faqat boshqa user bo'lsa
    if (String(job.client_id) !== String(userId)) {
      createNotification(io, {
        userId: job.client_id,
        type: 'proposal_received',
        title: 'Yangi taklif!',
        message: `"${job.title}" loyihangizga ${freelancerName} tomonidan yangi taklif keldi.`,
        relatedId: proposal.id,
        relatedType: 'proposal',
        translationData: { jobTitle: job.title, freelancerName }
      });
    }

    return res.status(201).json({
      success: true,
      message: "proposals.success.created",
      data: { proposal },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Create proposal error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Taklif yaratishda xato yuz berdi.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};


/**
 * GET /proposals
 * Get all proposals with filters
 */
const getProposals = async (req, res) => {
  try {
    const { job_id, freelancer_id, status, page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = [];
    let params = [];
    let i = 1;

    // ✅ jobs o‘chirilmagan bo‘lsin
    where.push("j.deleted_at IS NULL");

    if (job_id) {
      where.push(`p.job_id = $${i++}`);
      params.push(job_id);
    }

    if (freelancer_id) {
      where.push(`p.freelancer_id = $${i++}`);
      params.push(freelancer_id);
    }

    if (status) {
      where.push(`p.status = $${i++}`);
      params.push(status);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      ${whereClause}
      `,
      params
    );
    const total = countResult.rows[0]?.c ?? 0;

    const listQuery = `
      SELECT 
        p.*,
        u.id as freelancer_id,
        u.first_name as freelancer_first_name,
        u.last_name as freelancer_last_name,
        u.email as freelancer_email,

        j.id as job_id,
        j.title as job_title,
        j.client_id as job_client_id,
        j.status as job_status,
        j.currency as job_currency
      FROM proposals p
      JOIN users u ON u.id = p.freelancer_id
      JOIN jobs j ON j.id = p.job_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const listParams = [...params, parseInt(limit, 10), offset];
    const proposalsResult = await pool.query(listQuery, listParams);

    return res.json({
      success: true,
      data: {
        proposals: proposalsResult.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error("Get proposals error:", error);
    return res.status(500).json({
      success: false,
      message: "Takliflarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /proposals/:id
 * Get proposal by ID
 */
const getProposalById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    await client.query("BEGIN");

    const r = await client.query(
      `
      SELECT 
        p.*,
        j.client_id AS job_client_id,
        j.deleted_at
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      WHERE p.id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (!r.rows.length || r.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Taklif topilmadi." });
    }

    const proposal = r.rows[0];

    // ✅ Client job egasi bo'lsa va hali viewed_at yo'q bo'lsa -> set
    if (role === "client" && String(proposal.job_client_id) === String(userId) && !proposal.viewed_at) {
      await client.query(
        `UPDATE proposals SET viewed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id]
      );
      proposal.viewed_at = new Date();
    }

    await client.query("COMMIT");
    return res.json({ success: true, data: { proposal } });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Get proposal by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Taklifni olishda xato.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * GET /proposals/my
 * Get current freelancer proposals
 */
const getMyProposals = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = ["j.deleted_at IS NULL"];
    let params = [];
    let i = 1;

    if (role?.toLowerCase() === "client") {
      where.push(`j.client_id = $${i++}`);
      params.push(userId);
    } else {
      where.push(`p.freelancer_id = $${i++}`);
      params.push(userId);
    }

    if (status) {
      where.push(`p.status = $${i++}`);
      params.push(status);
    }

    const whereClause = `WHERE ${where.join(" AND ")}`;

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      ${whereClause}
      `,
      params
    );
    const total = countResult.rows[0]?.c ?? 0;

    const listQuery = `
      SELECT 
        p.*,
        j.id as job_id,
        j.title as job_title,
        j.status as job_status,
        j.client_id as job_client_id,
        j.currency as job_currency,
        u_client.first_name as client_first_name,
        u_client.last_name as client_last_name,
        COALESCE(u_client.avatar_url, cp.avatar_url) as client_avatar,
        u_freelancer.first_name as freelancer_first_name,
        u_freelancer.last_name as freelancer_last_name,
        COALESCE(u_freelancer.avatar_url, f.avatar_url) as freelancer_avatar,
        f.title as freelancer_title,
        f.rating as freelancer_rating,
        (SELECT COUNT(*)::int FROM ratings WHERE to_user_id = u_freelancer.id) as freelancer_reviews_count
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      JOIN users u_client ON u_client.id = j.client_id
      LEFT JOIN client_profiles cp ON cp.user_id = u_client.id
      JOIN users u_freelancer ON u_freelancer.id = p.freelancer_id
      LEFT JOIN freelancer_profiles f ON f.user_id = u_freelancer.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const listParams = [...params, parseInt(limit, 10), offset];
    const proposalsResult = await pool.query(listQuery, listParams);

    return res.json({
      success: true,
      data: {
        proposals: proposalsResult.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error("Get my proposals error:", error);
    return res.status(500).json({
      success: false,
      message: "Takliflarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /proposals/project/:projectId
 * Get proposals for a job (only job owner or admin)
 */
const getProjectProposals = async (req, res) => {
  try {
    const { projectId } = req.params; // bu aslida jobId
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === "admin";

    const jobCheck = await pool.query("SELECT client_id, deleted_at FROM jobs WHERE id = $1", [
      projectId,
    ]);

    if (jobCheck.rows.length === 0 || jobCheck.rows[0].deleted_at) {
      return res.status(404).json({ success: false, message: "Loyiha topilmadi." });
    }

    if (!isAdmin && jobCheck.rows[0].client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Siz bu loyihaning egasi emassiz.",
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = ["p.job_id = $1"];
    let params = [projectId];
    let i = 2;

    if (status) {
      where.push(`p.status = $${i++}`);
      params.push(status);
    }

    const whereClause = `WHERE ${where.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS c FROM proposals p ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.c ?? 0;

    const listQuery = `
      SELECT 
        p.*,
        u.id as freelancer_id,
        u.first_name as freelancer_first_name,
        u.last_name as freelancer_last_name,
        u.email as freelancer_email,
        COALESCE(u.avatar_url, fp.avatar_url) as freelancer_avatar,
        j.currency as job_currency,
        fp.rating as freelancer_rating,
        (SELECT COUNT(*)::int FROM ratings WHERE to_user_id = u.id) as freelancer_reviews_count
      FROM proposals p
      JOIN users u ON u.id = p.freelancer_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;
    const listParams = [...params, parseInt(limit, 10), offset];
    const proposalsResult = await pool.query(listQuery, listParams);

    return res.json({
      success: true,
      data: {
        proposals: proposalsResult.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error("Get project proposals error:", error);
    return res.status(500).json({
      success: false,
      message: "Takliflarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * PUT /proposals/:id
 * Update proposal (only author, only pending)
 * ✅ schema: cover_letter, proposed_price, proposed_duration
 */
const updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const proposalCheck = await pool.query(
      "SELECT freelancer_id, job_id, status FROM proposals WHERE id = $1",
      [id]
    );

    if (proposalCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Taklif topilmadi." });
    }

    const proposal = proposalCheck.rows[0];

    // Job egasini ham tekshiramiz (statusni o'zgartirish uchun)
    const jobCheck = await pool.query("SELECT client_id FROM jobs WHERE id = $1", [proposal.job_id]);
    const isJobOwner = jobCheck.rows.length > 0 && String(jobCheck.rows[0].client_id) === String(userId);
    const isAdmin = req.user && req.user.role === "admin";

    if (proposal.freelancer_id !== userId && !isJobOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Siz bu taklifni yangilash huquqiga ega emassiz.",
      });
    }

    const { cover_letter, proposed_price, proposed_duration, status, currency } = req.body;

    // Faqat buyurtmachi yoki admin statusni o'zgartira oladi
    if (status !== undefined && !isJobOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Faqat buyurtmachi statusni o'zgartirishi mumkin.",
      });
    }

    if (proposal.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Rad etilgan takliflarni o'zgartirib bo'lmaydi.",
      });
    }

    // const { cover_letter, proposed_price, proposed_duration } = req.body; // Yuqorida olindi

    const sets = [];
    const vals = [];
    let i = 1;

    if (cover_letter !== undefined) {
      sets.push(`cover_letter = $${i++}`);
      vals.push(cover_letter);
    }
    if (proposed_price !== undefined) {
      sets.push(`proposed_price = $${i++}`);
      vals.push(proposed_price);
    }
    if (proposed_duration !== undefined) {
      sets.push(`proposed_duration = $${i++}`);
      vals.push(proposed_duration);
    }
    if (status !== undefined) {
      sets.push(`status = $${i++}`);
      vals.push(status);
    }
    if (currency !== undefined) {
      sets.push(`currency = $${i++}`);
      vals.push(currency);
    }

    if (sets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Yangilanish uchun hech bo‘lmaganda bitta maydon kerak.",
      });
    }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);

    vals.push(id);

    const q = `
      UPDATE proposals
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING *
    `;

    const result = await pool.query(q, vals);

    return res.json({
      success: true,
      message: "Taklif muvaffaqiyatli yangilandi!",
      data: { proposal: result.rows[0] },
    });
  } catch (error) {
    console.error("Update proposal error:", error);
    return res.status(500).json({
      success: false,
      message: "Taklifni yangilashda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * DELETE /proposals/:id
 * Withdraw proposal (only author)
 */
const withdrawProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const proposalCheck = await pool.query(
      "SELECT freelancer_id, status FROM proposals WHERE id = $1",
      [id]
    );

    if (proposalCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Taklif topilmadi." });
    }

    const proposal = proposalCheck.rows[0];

    if (proposal.freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Siz bu taklifning muallifi emassiz.",
      });
    }

    // 1. Get job info to notify client
    const jobRes = await pool.query(
      `SELECT j.id, j.client_id, j.title, u.first_name, u.last_name 
       FROM proposals p 
       JOIN jobs j ON p.job_id = j.id 
       JOIN users u ON p.freelancer_id = u.id
       WHERE p.id = $1`,
      [id]
    );
    const job = jobRes.rows[0];

    // 2. Update status
    await pool.query(
      "UPDATE proposals SET status='withdrawn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // 3. Notify client
    const io = req.app.get("io");
    if (job) {
      if (String(job.client_id) !== String(userId)) {
        createNotification(io, {
          userId: job.client_id,
          type: 'proposal_withdrawn',
          title: 'Taklif qaytib olindi',
          message: `"${job.title}" loyihangizdan ${job.first_name} ${job.last_name} o'z taklifini qaytib oldi.`,
          relatedId: id,
          relatedType: 'proposal',
          translationData: { jobTitle: job.title, freelancerName: `${job.first_name} ${job.last_name}` }
        });
      }
    }

    return res.json({ success: true, message: "Taklif bekor qilindi!" });
  } catch (error) {
    console.error("Withdraw proposal error:", error);
    return res.status(500).json({
      success: false,
      message: "Taklifni bekor qilishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /proposals/:id/accept
 * Accept proposal (client/admin)
 */
/**
 * POST /proposals/:id/accept
 * Accept proposal (client/admin) -> creates contract + creates chat(contract_id)
 */
// src/controllers/proposalController.js
// proposalController.js





// POST /proposals/:id/accept
// Accept -> contract flow (sizdagi eski kod) +
// ✅ accepted deposit consume
// ✅ other rejected deposits refund
// =========================
const acceptProposal = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // proposal id
    const userId = req.user.id;
    const io = req.app.get("io");
    const userRole = req.user.role;
    const isAdmin = userRole === "admin";

    if (!["client", "admin"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Faqat client yoki admin taklifni qabul qilishi mumkin.",
      });
    }

    await client.query("BEGIN");

    // 1) Proposal + Job (LOCK)
    const pr = await client.query(
      `
      SELECT
        p.id AS proposal_id,
        p.job_id,
        p.freelancer_id,
        p.proposed_price,
        p.status AS proposal_status,
        p.deposit_amount,
        p.deposit_status,
        p.milestones as proposal_milestones,
        p.currency as proposal_currency,

        j.title AS job_title,
        j.client_id,
        j.status AS job_status,
        j.deleted_at
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      WHERE p.id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (!pr.rows.length || pr.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Taklif topilmadi." });
    }

    const row = pr.rows[0];

    if (!isAdmin && String(row.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Siz bu job egasi emassiz." });
    }

    if (!["pending", "shortlisted"].includes(normalizeStatus(row.proposal_status))) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: 'Faqat "pending" yoki "shortlisted" taklif qabul qilinadi.' });
    }

    if (normalizeStatus(row.job_status) !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: 'Faqat "open" jobda qabul qilish mumkin.' });
    }

    // 2) Contract bor-yo‘qligini tekshir
    const existing = await client.query(
      `SELECT id FROM contracts WHERE job_id=$1 AND status IN ('active','disputed') LIMIT 1`,
      [row.job_id]
    );
    if (existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Bu job uchun active/disputed contract bor." });
    }

    const currency = row.proposal_currency || 'USD';
    const rawPrice = Number(row.proposed_price) || 0;
    if (rawPrice <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "proposed_price noto'g'ri." });
    }

    let totalAmount;
    let totalAmountUSD;
    let USD_TO_UZS;

    const { getLatestRate } = require("../services/currencyService");

    if (currency === 'UZS') {
      totalAmount = rawPrice;
      const UZS_TO_USD = await getLatestRate('UZS', 'USD');
      USD_TO_UZS = await getLatestRate('USD', 'UZS');
      totalAmountUSD = rawPrice * UZS_TO_USD;
    } else {
      totalAmountUSD = rawPrice;
      USD_TO_UZS = await getLatestRate('USD', 'UZS');
      totalAmount = Math.round(totalAmountUSD * USD_TO_UZS);
    }

    // ✅ 3) Balance check — contract yaratilishidan OLDIN!
    await ensureBalanceRow(client, row.client_id);
    const balR = await client.query(
      `SELECT available_balance, escrow_balance FROM user_balances WHERE user_id=$1 FOR UPDATE`,
      [row.client_id]
    );
    const available = Number(balR.rows[0]?.available_balance ?? 0);
    
    // Kurs farqi va yaxlitlashdagi xatoliklar uchun kichik bag'rikenglik (tolerance)
    // Masalan, 1% yoki $2 atrofida (25,000 UZS)
    const tolerance = 25000; 
    
    if (available + tolerance < totalAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Balansda yetarli mablag' yo'q. Kerak: ${totalAmount.toLocaleString()} UZS (~$${totalAmountUSD.toFixed(2)}), mavjud: ${available.toLocaleString()} UZS. Avval hisob to'ldiring.`,
        required_uzs: totalAmount,
        available_uzs: available,
        required_usd: totalAmountUSD,
      });
    }

    // 4) Proposal ACCEPT + boshqalar REJECT (LOCK bo'lishi uchun FOR UPDATE)
    await client.query(`UPDATE proposals SET status='accepted', updated_at=NOW() WHERE id=$1`, [id]);

    // rejected list (kimlarga refund bo'ladi)
    const rejectedList = await client.query(
      `
      SELECT id, freelancer_id, deposit_amount, deposit_status
      FROM proposals
      WHERE job_id = $1 AND id <> $2
      FOR UPDATE
      `,
      [row.job_id, id]
    );

    await client.query(
      `UPDATE proposals SET status='rejected', updated_at=NOW()
       WHERE job_id=$1 AND id <> $2`,
      [row.job_id, id]
    );

    // 4) Job -> in_progress
    await client.query(`UPDATE jobs SET status='in_progress', updated_at=NOW() WHERE id=$1`, [row.job_id]);

    // 5) Contract create (Original currency amount and Locked exchange rate)
    const contractRes = await client.query(
      `
      INSERT INTO contracts (
        job_id, freelancer_id, client_id,
        total_amount, platform_fee, currency,
        status, exchange_rate, signed_at, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,'active',$7,NOW(),NOW(),NOW())
      RETURNING *
      `,
      [row.job_id, row.freelancer_id, row.client_id, rawPrice, 0, currency, USD_TO_UZS]
    );
    const contract = contractRes.rows[0];

    // 5.1) milestone create (Original amount)
    const proposalMilestones = row.proposal_milestones;
    
    if (Array.isArray(proposalMilestones) && proposalMilestones.length > 0) {
      // Bir nechta milestone bo'lsa
      for (const m of proposalMilestones) {
        await client.query(
          `INSERT INTO milestones (contract_id, title, amount, status, created_at)
           VALUES ($1, $2, $3, 'pending', NOW())`,
          [contract.id, m.description || "Untitled Milestone", Number(m.amount) || 0]
        );
      }
    } else {
      // Milestone yo'q bo'lsa (Project-based)
      await client.query(
        `INSERT INTO milestones (contract_id, title, amount, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())`,
        [contract.id, "Full project", rawPrice]
      );
    }

    // 6) chat check/create (Reusing existing chat between this pair)
    const existingChatRes = await client.query(
      `SELECT id FROM chats 
       WHERE (job_id = $1 AND freelancer_id = $2)
          OR (freelancer_id = $2 AND job_id IN (SELECT id FROM jobs WHERE client_id = $3))
       ORDER BY created_at DESC LIMIT 1`,
      [row.job_id, row.freelancer_id, row.client_id]
    );

    let chat;
    if (existingChatRes.rows.length > 0) {
      const updateRes = await client.query(
        `UPDATE chats SET contract_id = $1, job_id = $2, status = 'active' 
         WHERE id = $3 
         RETURNING *`,
        [contract.id, row.job_id, existingChatRes.rows[0].id]
      );
      chat = updateRes.rows[0];
      // Notify members that chat info (contract/job) has changed
      io.to(`user_${row.client_id}`).emit('chat_info_updated', chat);
      io.to(`user_${row.freelancer_id}`).emit('chat_info_updated', chat);
    } else {
      const chatIns = await client.query(
        `INSERT INTO chats (contract_id, job_id, freelancer_id, status, created_at)
         VALUES ($1, $2, $3, 'active', NOW())
         RETURNING *`,
        [contract.id, row.job_id, row.freelancer_id]
      );
      chat = chatIns.rows[0];
      io.to(`user_${row.client_id}`).emit('chat_info_updated', chat);
      io.to(`user_${row.freelancer_id}`).emit('chat_info_updated', chat);
    }

    // 7) auto escrow hold — balance allaqachon yuqorida tekshirildi, endi ushlab qolamiz
    await client.query(
      `
      UPDATE user_balances
      SET available_balance = available_balance - $1,
          escrow_balance = COALESCE(escrow_balance,0) + $1,
          updated_at = NOW()
      WHERE user_id = $2
      `,
      [totalAmount, row.client_id]
    );

    await client.query(
      `
      INSERT INTO transactions (user_id,type,amount,currency,gateway,status,metadata,job_id,contract_id,created_at,updated_at)
      VALUES ($1,'escrow_hold',$2,'UZS','internal','completed',$3,$4,$5,NOW(),NOW())
      `,
      [
        row.client_id,
        totalAmount,
        JSON.stringify({
          contract_id: String(contract.id),
          job_id: String(row.job_id),
          proposal_id: String(id),
          amount_usd: totalAmountUSD,
          usd_to_uzs_rate: USD_TO_UZS,
          reason: "auto_hold_on_accept",
        }),
        row.job_id,
        contract.id,
      ]
    );

    // ===========================
    // ✅ DEPOSIT LOGIC
    // ===========================

    // A) accepted proposal deposit -> consume (locked -> platform)
    const acceptedDepAmt = Number(row.deposit_amount || 0);
    if (acceptedDepAmt > 0 && row.deposit_status === "locked") {
      const idemKey = `proposal_consume:${row.proposal_id}`;
      await consumeLockedToPlatform(client, {
        userId: row.freelancer_id,
        platformUserId: PLATFORM_USER_ID,
        amount: acceptedDepAmt,
        currency: "UZS",
        meta: { proposal_id: String(row.proposal_id), contract_id: String(contract.id), reason: "accepted_hired" },
        idempotencyKey: idemKey,
      });

      await client.query(
        `UPDATE proposals SET deposit_status='consumed', updated_at=NOW() WHERE id=$1`,
        [row.proposal_id]
      );
    }

    // B) rejected proposals deposit -> refund
    for (const p of rejectedList.rows) {
      const amt = Number(p.deposit_amount || 0);
      if (amt > 0 && p.deposit_status === "locked") {
        const idemKey = `proposal_refund:${p.id}`;
        await refundLockedToAvailable(client, {
          userId: p.freelancer_id,
          amount: amt,
          currency: "UZS",
          meta: { proposal_id: String(p.id), job_id: String(row.job_id), reason: "rejected_after_accept" },
          idempotencyKey: idemKey,
        });

        await client.query(
          `UPDATE proposals SET deposit_status='refunded', updated_at=NOW() WHERE id=$1`,
          [p.id]
        );
      }
    }

    await client.query("COMMIT");

    // 8) Notify freelancer about contract and milestones (background)
    createNotification(io, {
      userId: row.freelancer_id,
      type: 'contract_started',
      title: 'Shartnoma boshlandi!',
      message: `"${row.job_title}" loyihasi bo'yicha shartnoma imzolandi. Siz uchun yangi bosqichlar (milestones) yaratildi va mablag' muzlatildi.`,
      relatedId: contract.id,
      relatedType: 'contract',
      translationData: { jobTitle: row.job_title }
    });
    createNotification(io, {
      userId: row.freelancer_id,
      type: 'proposal_accepted',
      title: 'Taklifingiz qabul qilindi!',
      message: `"${row.job_title}" loyihasi bo'yicha yuborgan taklifingiz qabul qilindi. Tabriklaymiz!`,
      relatedId: contract.id,
      relatedType: 'contract',
      translationData: { jobTitle: row.job_title }
    });

    // 9) Notify client about payment (background)
    // 4) Notify client (payment success) - Skip if redundant
    /*
    createNotification(io, {
      userId: row.client_id,
      type: 'payment_sent',
      title: "To'lov muvaffaqiyatli!",
      message: `"${row.job_title}" loyihasi uchun ${totalAmount} UZS miqdoridagi mablag' band qilindi (escrow).`,
      relatedId: contract.id,
      relatedType: 'contract',
      translationData: { jobTitle: row.job_title, amount: totalAmount.toLocaleString() }
    });
    */

    // 10) Notify other freelancers (background)
    for (const p of rejectedList.rows) {
      createNotification(io, {
        userId: p.freelancer_id,
        type: 'proposal_rejected',
        title: 'Taklif rad etildi',
        message: `"${row.job_title}" loyihasiga yuborgan taklifingiz rad etildi. Boshqa loyihalarni ko'rib chiqing.`,
        relatedId: row.job_id,
        relatedType: 'project',
        translationData: { jobTitle: row.job_title }
      });
    }

    return res.json({
      success: true,
      message: "Taklif qabul qilindi! Contract/chat yaratildi. Depositlar consume/refund qilindi.",
      data: { contract, chat },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Accept proposal error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Taklifni qabul qilishda xato.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};


module.exports = { acceptProposal };




/**
 * POST /proposals/:id/reject
 * Reject proposal (client/admin)
 */
const rejectProposal = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === "admin";

    if (!["client", "admin"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Faqat client yoki admin rad etishi mumkin.",
      });
    }

    await client.query("BEGIN");

    const q = await client.query(
      `
      SELECT 
        p.id, p.status, p.freelancer_id, p.deposit_amount, p.deposit_status,
        j.title AS job_title, j.client_id, j.deleted_at
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      WHERE p.id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (!q.rows.length || q.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Taklif topilmadi." });
    }

    const row = q.rows[0];

    if (!isAdmin && String(row.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Siz bu job egasi emassiz." });
    }

    if (!["pending", "shortlisted"].includes(normalizeStatus(row.status))) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: 'Faqat "pending" yoki "shortlisted" statusdagi taklifni rad etish mumkin.',
      });
    }

    // 1) status -> rejected
    await client.query(
      `UPDATE proposals SET status='rejected', updated_at=NOW() WHERE id=$1`,
      [id]
    );

    // 2) refund deposit
    const depAmt = Number(row.deposit_amount || 0);
    if (depAmt > 0 && row.deposit_status === "locked") {
      const idemKey = `proposal_refund:${row.id}`;
      await refundLockedToAvailable(client, {
        userId: row.freelancer_id,
        amount: depAmt,
        currency: "UZS",
        meta: { proposal_id: String(row.id), reason: "rejected_by_client" },
        idempotencyKey: idemKey,
      });

      await client.query(
        `UPDATE proposals SET deposit_status='refunded', updated_at=NOW() WHERE id=$1`,
        [id]
      );
    }

    await client.query("COMMIT");

    // 3. Send notification
    const io = req.app.get("io");
    if (String(row.freelancer_id) !== String(userId)) {
      createNotification(io, {
        userId: row.freelancer_id,
        type: 'proposal_rejected',
        title: 'Taklif rad etildi',
        message: `"${row.job_title}" loyihasiga yuborgan taklifingiz buyurtmachi tomonidan rad etildi.`,
        relatedId: id,
        relatedType: 'proposal',
        translationData: { jobTitle: row.job_title }
      });
    }

    return res.json({ success: true, message: "Taklif rad etildi, deposit qaytarildi." });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Reject proposal error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Taklifni rad etishda xato.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * POST /proposals/:id/ai-writer
 * AI proposal writer helper (stub)
 */
const aiWriter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const proposalResult = await pool.query(
      "SELECT job_id, freelancer_id FROM proposals WHERE id = $1",
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Taklif topilmadi." });
    }

    if (proposalResult.rows[0].freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Siz bu taklifning muallifi emassiz.",
      });
    }

    const jobResult = await pool.query(
      "SELECT title, description, required_skills FROM jobs WHERE id = $1 AND deleted_at IS NULL",
      [proposalResult.rows[0].job_id]
    );

    // TODO: AI servis
    const improvedCoverLetter = "Yaxshilangan taklif matni...";

    return res.json({
      success: true,
      data: {
        job: jobResult.rows[0] || null,
        improved_cover_letter: improvedCoverLetter,
      },
    });
  } catch (error) {
    console.error("AI writer error:", error);
    return res.status(500).json({
      success: false,
      message: "AI yozuvchi xatosi.",
      error: error.message,
    });
  }
};

/**
 * POST /proposals/:id/score
 * AI proposal scoring (simple)
 */
const aiScore = async (req, res) => {
  try {
    const { id } = req.params;

    const proposalResult = await pool.query("SELECT cover_letter FROM proposals WHERE id = $1", [id]);

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Taklif topilmadi." });
    }

    const coverLetter = proposalResult.rows[0].cover_letter || "";
    let score = 50;

    if (coverLetter.length > 100) score += 20;
    if (coverLetter.length > 200) score += 10;
    if (coverLetter.toLowerCase().includes("tajriba")) score += 10;
    if (coverLetter.toLowerCase().includes("ko'nikma") || coverLetter.toLowerCase().includes("konikma"))
      score += 10;

    score = Math.min(100, score);

    return res.json({
      success: true,
      data: {
        proposal_id: id,
        score,
        feedback: score > 70 ? "Yaxshi taklif" : "Yaxshilash tavsiya etiladi",
      },
    });
  } catch (error) {
    console.error("AI score error:", error);
    return res.status(500).json({
      success: false,
      message: "Baholashda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /proposals/invite
 * Invite a freelancer to a job (only clients can invite)
 */
const inviteFreelancer = async (req, res) => {
  const client = await pool.connect();
  const io = req.app.get("io");
  try {
    const userId = req.user.id;
    const { job_id, freelancer_id } = req.body;

    if (!job_id || !freelancer_id) {
      return res.status(400).json({
        success: false,
        message: "job_id va freelancer_id majburiy.",
      });
    }

    await client.query("BEGIN");

    // 1. Check if job exists and user is owner
    const jobCheck = await client.query(
      "SELECT id, title, client_id, status FROM jobs WHERE id = $1",
      [job_id]
    );

    if (jobCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Loyiha topilmadi." });
    }

    const job = jobCheck.rows[0];

    if (String(job.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Siz bu loyihaning egasi emassiz." });
    }

    // 2. Check if already invited or applied
    const existing = await client.query(
      "SELECT id FROM proposals WHERE job_id = $1 AND freelancer_id = $2",
      [job_id, freelancer_id]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Bu mutaxassis allaqachon taklif qilingan yoki ariza topshirgan.",
      });
    }

    // 3. Create invitation record (proposal with status='invited')
    const result = await client.query(
      `INSERT INTO proposals (job_id, freelancer_id, status, cover_letter, is_invitation)
       VALUES ($1, $2, 'invited', $3, TRUE)
       RETURNING *`,
      [job_id, freelancer_id, `Sizni "${job.title}" loyihasida hamkorlik qilishga taklif qilaman.`]
    );

    const proposal = result.rows[0];

    await client.query("COMMIT");

    // 4. Send notification to freelancer
    if (String(freelancer_id) !== String(userId)) {
      const clientName = `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() || "Mijoz";
      createNotification(io, {
        userId: freelancer_id,
        type: 'job_invitation',
        title: 'Yangi ish taklifi!',
        message: `${clientName} sizni "${job.title}" loyihasiga taklif qildi.`,
        relatedId: job_id,
        relatedType: 'project',
        translationData: { clientName, jobTitle: job.title }
      });
    }

    return res.status(201).json({
      success: true,
      message: "Taklif muvaffaqiyatli yuborildi!",
      data: { proposal },
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Invite freelancer error:", error);
    return res.status(500).json({
      success: false,
      message: "Taklif yuborishda xato yuz berdi.",
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  createProposal,
  getProposals,
  getProposalById,
  getMyProposals,
  getProjectProposals,
  updateProposal,
  withdrawProposal,
  acceptProposal,
  rejectProposal,
  aiWriter,
  aiScore,
  inviteFreelancer,
};
