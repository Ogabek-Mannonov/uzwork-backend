// src/controllers/contractController.js
const pool = require('../db/pool');
const { createNotification } = require('./notificationController');


/**
 * POST /contracts
 * Create a contract from accepted proposal
 * DB: proposals(job_id, freelancer_id, proposed_price, status), jobs(client_id, job_type, status)
 * DB: contracts(job_id, freelancer_id, client_id, total_amount, platform_fee, status, signed_at)
 * DB: milestones(contract_id, title, amount, status)
 */


// const createContract = async (req, res) => {
//   const client = await pool.connect();

//   try {
//     const userId = req.user.id;
//     const { proposal_id } = req.body;

//     if (!proposal_id) {
//       return res.status(400).json({ success: false, message: "proposal_id kerak." });
//     }

//     await client.query("BEGIN");

//     // 1) Proposal + Job ni olib kelamiz (FOR UPDATE - parallel requestlar muammo qilmasin)
//     const pr = await client.query(
//       `
//       SELECT
//         p.id AS proposal_id,
//         p.job_id,
//         p.freelancer_id,
//         p.proposed_price,
//         p.status AS proposal_status,
//         p.milestones AS proposal_milestones,

//         j.client_id,
//         j.job_type,
//         j.status AS job_status,
//         j.deleted_at
//       FROM proposals p
//       JOIN jobs j ON j.id = p.job_id
//       WHERE p.id = $1
//       FOR UPDATE
//       `,
//       [proposal_id]
//     );

//     if (pr.rows.length === 0) {
//       await client.query("ROLLBACK");
//       return res.status(404).json({ success: false, message: "Taklif (proposal) topilmadi." });
//     }

//     const row = pr.rows[0];

//     if (row.deleted_at) {
//       await client.query("ROLLBACK");
//       return res.status(400).json({ success: false, message: "Bu job o‘chirilgan." });
//     }

//     // Faqat job egasi contract yaratsin
//     if (row.client_id !== userId) {
//       await client.query("ROLLBACK");
//       return res.status(403).json({ success: false, message: "Siz bu job egasi emassiz." });
//     }

//     // Proposal accepted bo‘lishi shart
//     if (normalizeStatus(row.proposal_status) !== "accepted") {
//       await client.query("ROLLBACK");
//       return res.status(400).json({
//         success: false,
//         message: 'Faqat "accepted" statusdagi proposal uchun contract yaratish mumkin.',
//       });
//     }

//     // Job holati tekshiruvi
//     if (!["open", "in_progress"].includes(normalizeStatus(row.job_status))) {
//       await client.query("ROLLBACK");
//       return res.status(400).json({
//         success: false,
//         message: "Bu job holatida contract yaratib bo‘lmaydi.",
//       });
//     }

//     // 2) Job uchun active/disputed contract bor-yo‘qligini tekshiramiz
//     const existing = await client.query(
//       `
//       SELECT id
//       FROM contracts
//       WHERE job_id = $1
//         AND status IN ('active','disputed')
//       LIMIT 1
//       `,
//       [row.job_id]
//     );

//     if (existing.rows.length > 0) {
//       await client.query("ROLLBACK");
//       return res.status(409).json({
//         success: false,
//         message: "Bu job uchun allaqachon active/disputed contract bor.",
//       });
//     }

//     const totalAmount = Number(row.proposed_price) || 0;
//     if (totalAmount <= 0) {
//       await client.query("ROLLBACK");
//       return res.status(400).json({
//         success: false,
//         message: "proposed_price noto‘g‘ri (0 dan katta bo‘lishi kerak).",
//       });
//     }

//     const platformFee = calcFee(totalAmount);

//     // 3) Contract yaratamiz
//     const ins = await client.query(
//       `
//       INSERT INTO contracts (
//         job_id, freelancer_id, client_id,
//         total_amount, platform_fee,
//         status, signed_at, created_at, updated_at
//       )
//       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW(), NOW())
//       RETURNING *
//       `,
//       [row.job_id, row.freelancer_id, row.client_id, totalAmount, platformFee]
//     );

//     const contract = ins.rows[0];

//     // 4) ✅ Chatni avtomatik yaratamiz (contract_id bilan)
//     // UNIQUE index bo'lsa dublikat bo'lib ketmaydi
//     const chatInsert = await client.query(
//       `
//       INSERT INTO chats (contract_id, job_id, status, created_at)
//       VALUES ($1, $2, 'active', NOW())
//       ON CONFLICT (contract_id) DO NOTHING
//       RETURNING *
//       `,
//       [contract.id, row.job_id]
//     );

//     let chat = chatInsert.rows[0] || null;
//     if (!chat) {
//       const exChat = await client.query(
//         `SELECT * FROM chats WHERE contract_id = $1 LIMIT 1`,
//         [contract.id]
//       );
//       chat = exChat.rows[0] || null;
//     }

//     // 5) Job status -> in_progress
//     await client.query(
//       `UPDATE jobs SET status='in_progress', updated_at=NOW() WHERE id=$1`,
//       [row.job_id]
//     );

//     // 6) Proposal milestones jsonb bo‘lsa -> milestones table ga yozamiz
//     let createdMilestones = [];
//     try {
//       const ms = row.proposal_milestones;
//       const arr = Array.isArray(ms) ? ms : typeof ms === "string" ? JSON.parse(ms) : [];

//       if (Array.isArray(arr) && arr.length > 0) {
//         for (const m of arr) {
//           const title = (m?.title || "").toString().trim();
//           const amount = Number(m?.amount) || 0;
//           if (!title || amount <= 0) continue;

//           const mRes = await client.query(
//             `
//             INSERT INTO milestones (contract_id, title, amount, status)
//             VALUES ($1, $2, $3, 'pending')
//             RETURNING *
//             `,
//             [contract.id, title, amount]
//           );
//           createdMilestones.push(mRes.rows[0]);
//         }
//       }
//     } catch (e) {
//       // parse xato bo'lsa ham contract/chat yiqilmasin
//     }

//     await client.query("COMMIT");

//     return res.status(201).json({
//       success: true,
//       message: "Shartnoma muvaffaqiyatli yaratildi! Chat ham yaratildi.",
//       data: {
//         contract,
//         chat,
//         milestones: createdMilestones,
//       },
//     });
//   } catch (error) {
//     try {
//       await client.query("ROLLBACK");
//     } catch {}

//     console.error("Create contract error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Shartnoma yaratishda xato yuz berdi.",
//       error: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

/**
 * GET /contracts (public)
 * contracts + users + job
 */
const getContracts = async (req, res) => {
  try {
    const { job_id, client_id, freelancer_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = ['j.deleted_at IS NULL'];
    const params = [];
    let i = 1;

    if (job_id) { where.push(`c.job_id = $${i++}`); params.push(job_id); }
    if (client_id) { where.push(`c.client_id = $${i++}`); params.push(client_id); }
    if (freelancer_id) { where.push(`c.freelancer_id = $${i++}`); params.push(freelancer_id); }
    if (status) { where.push(`c.status = $${i++}`); params.push(status); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM contracts c JOIN jobs j ON j.id = c.job_id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const listRes = await pool.query(
      `
      SELECT
        c.*,
        j.title AS job_title,
        j.status AS job_status,
        j.currency AS job_currency,

        uc.first_name AS client_first_name,
        uc.last_name  AS client_last_name,
        uc.avatar_url AS client_avatar_url,
        uf.first_name AS freelancer_first_name,
        uf.last_name  AS freelancer_last_name,
        uf.avatar_url AS freelancer_avatar_url
      FROM contracts c
      JOIN jobs j ON j.id = c.job_id
      JOIN users uc ON uc.id = c.client_id
      JOIN users uf ON uf.id = c.freelancer_id

      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, parseInt(limit), offset]
    );

    return res.json({
      success: true,
      data: {
        contracts: listRes.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Shartnomalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /contracts/:id (protected)
 * contract + job + users + milestones + last disputes
 */
const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const cRes = await pool.query(
      `
      SELECT
        c.*,
        j.title AS job_title,
        j.description AS job_description,
        j.job_type,
        j.status AS job_status,

        uc.first_name AS client_first_name,
        uc.last_name  AS client_last_name,
        uc.email      AS client_email,
        COALESCE(uc.avatar_url, cp.avatar_url) AS client_avatar_url,

        uf.first_name AS freelancer_first_name,
        uf.last_name  AS freelancer_last_name,
        uf.email      AS freelancer_email,
        COALESCE(uf.avatar_url, fp.avatar_url) AS freelancer_avatar_url
      FROM contracts c
      JOIN jobs j ON j.id = c.job_id
      JOIN users uc ON uc.id = c.client_id
      LEFT JOIN client_profiles cp ON cp.user_id = uc.id
      JOIN users uf ON uf.id = c.freelancer_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = uf.id
      WHERE c.id = $1 AND j.deleted_at IS NULL
      LIMIT 1

      `,
      [id]
    );

    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shartnoma topilmadi.' });
    }

    const contract = cRes.rows[0];

    const isMember = contract.client_id === userId || contract.freelancer_id === userId;
    if (!isMember && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Ruxsat yo‘q.' });
    }

    const mRes = await pool.query(
      `SELECT * FROM milestones WHERE contract_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    const dRes = await pool.query(
      `
      SELECT id, status, reason, created_at, raised_by, against_user, amount, currency
      FROM disputes
      WHERE contract_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [id]
    );

    return res.json({
      success: true,
      data: {
        contract,
        milestones: mRes.rows,
        disputes: dRes.rows
      }
    });
  } catch (error) {
    console.error('Get contract by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Shartnomani olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /contracts/my (protected)
 */
const getMyContracts = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = ['j.deleted_at IS NULL'];
    const params = [];
    let i = 1;

    if (role === 'client') {
      where.push(`c.client_id = $${i++}`);
      params.push(userId);
    } else if (role === 'freelancer') {
      where.push(`c.freelancer_id = $${i++}`);
      params.push(userId);
    } else if (role === 'admin') {
      // admin ko‘rsa ham bo‘ladi
      where.push(`1=1`);
    } else {
      return res.status(403).json({ success: false, message: 'Role noto‘g‘ri.' });
    }

    if (status) {
      where.push(`c.status = $${i++}`);
      params.push(status);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM contracts c JOIN jobs j ON j.id = c.job_id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const listRes = await pool.query(
      `
      SELECT
        c.*,
        j.title AS job_title,
        j.status AS job_status,
        j.currency AS job_currency,
        uc.first_name AS client_first_name,
        uc.last_name  AS client_last_name,
        COALESCE(uc.avatar_url, cp.avatar_url) AS client_avatar_url,
        uf.first_name AS freelancer_first_name,
        uf.last_name  AS freelancer_last_name,
        COALESCE(uf.avatar_url, fp.avatar_url) AS freelancer_avatar_url
      FROM contracts c
      JOIN jobs j ON j.id = c.job_id
      JOIN users uc ON uc.id = c.client_id
      LEFT JOIN client_profiles cp ON cp.user_id = uc.id
      JOIN users uf ON uf.id = c.freelancer_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = uf.id

      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, parseInt(limit), offset]
    );

    return res.json({
      success: true,
      data: {
        contracts: listRes.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get my contracts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Shartnomalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /contracts/:id
 * Sizning schema’da contract’da start_date/end_date/milestones JSON yo‘q.
 * Shu sabab: faqat ADMIN status o‘zgartirsin (xavfsiz).
 */
const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Contractni update qilish (manual) faqat admin uchun.'
      });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'status yuboring.' });
    }

    const allowed = ['active', 'completed', 'cancelled', 'disputed'];
    if (!allowed.includes(normalizeStatus(status))) {
      return res.status(400).json({ success: false, message: 'status noto‘g‘ri.' });
    }

    const r = await pool.query(
      `
      UPDATE contracts
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [normalizeStatus(status), id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shartnoma topilmadi.' });
    }

    const contract = r.rows[0];

    // ✅ Notify parties
    const io = req.app.get("io");
    [contract.client_id, contract.freelancer_id].forEach(uid => {
      createNotification(io, {
        userId: uid,
        type: 'contract_updated',
        title: 'Shartnoma yangilandi',
        message: `Admin tomonidan shartnoma holati yangilandi: ${status}.`,
        relatedId: id,
        relatedType: 'contract',
        translationData: { status }
      });
    });

    return res.json({
      success: true,
      message: 'Contract yangilandi.',
      data: { contract }
    });
  } catch (error) {
    console.error('Update contract error:', error);
    return res.status(500).json({
      success: false,
      message: 'Shartnomani yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /contracts/:id/complete (client)
 */
// contractController.js
const normalizeStatus = (s) => (s ? String(s).toLowerCase() : null);

const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID; // platform balance uchun
const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT || 10);

async function ensureBalanceRow(qClient, userId) {
  await qClient.query(
    `INSERT INTO user_balances (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

const completeContract = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: contractId } = req.params;
    const userId = req.user.id;

    if (!PLATFORM_USER_ID) {
      return res.status(500).json({
        success: false,
        message: "PLATFORM_USER_ID .env da yo‘q (fee uchun kerak).",
      });
    }

    await client.query("BEGIN");

    // contract lock
    const cRes = await client.query(
      `SELECT id, job_id, client_id, freelancer_id, total_amount, status
       FROM contracts
       WHERE id=$1
       FOR UPDATE`,
      [contractId]
    );

    if (!cRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Shartnoma topilmadi." });
    }

    const c = cRes.rows[0];

    if (String(c.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Faqat client yakunlay oladi." });
    }

    if (normalizeStatus(c.status) !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Faqat active contract yakunlanadi." });
    }

    const gross = Number(c.total_amount) || 0;
    if (gross <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Contract total_amount noto‘g‘ri." });
    }

    const fee = Math.max(0, Math.round((gross * PLATFORM_FEE_PCT) / 100));
    const net = Math.max(0, gross - fee);

    // balances ensure
    await ensureBalanceRow(client, c.client_id);
    await ensureBalanceRow(client, c.freelancer_id);
    await ensureBalanceRow(client, PLATFORM_USER_ID);

    // client escrow lock
    const escrowR = await client.query(
      `SELECT escrow_balance
       FROM user_balances
       WHERE user_id = $1
       FOR UPDATE`,
      [c.client_id]
    );

    const escrowBal = Number(escrowR.rows[0]?.escrow_balance ?? 0);
    if (escrowBal < gross) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Escrowda yetarli mablag‘ yo‘q. Accept paytida hold bo‘lishi kerak edi.",
      });
    }

    // ✅ 1) client escrowdan yechamiz
    await client.query(
      `UPDATE user_balances
       SET escrow_balance = escrow_balance - $1,
           total_spent = COALESCE(total_spent,0) + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [gross, c.client_id]
    );

    // ✅ 2) freelancergа net qo‘shamiz
    if (net > 0) {
      await client.query(
        `UPDATE user_balances
         SET available_balance = available_balance + $1,
             total_earned = COALESCE(total_earned,0) + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [net, c.freelancer_id]
      );
    }

    // ✅ 3) platform fee
    if (fee > 0) {
      await client.query(
        `UPDATE user_balances
         SET available_balance = available_balance + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [fee, PLATFORM_USER_ID]
      );
    }

    // ✅ 4) ledger tx: escrow_release (freelancer user_id bilan)
    const releaseTxR = await client.query(
      `
      INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, job_id, contract_id, created_at, updated_at)
      VALUES ($1,'escrow_release',$2,'UZS','internal','completed',$3,$4,$5,NOW(),NOW())
      RETURNING *
      `,
      [
        c.freelancer_id,
        net,
        JSON.stringify({
          contract_id: String(contractId),
          job_id: String(c.job_id),
          from_client: String(c.client_id),
          gross_amount: gross,
          fee_amount: fee,
          fee_pct: PLATFORM_FEE_PCT,
          reason: "auto_release_on_complete",
        }),
        c.job_id,
        contractId,
      ]
    );

    const releaseTx = releaseTxR.rows[0];

    // ✅ 5) fee tx
    let feeTx = null;
    if (fee > 0) {
      const feeTxR = await client.query(
        `
        INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, job_id, contract_id, created_at, updated_at)
        VALUES ($1,'fee',$2,'UZS','internal','completed',$3,$4,$5,NOW(),NOW())
        RETURNING *
        `,
        [
          PLATFORM_USER_ID,
          fee,
          JSON.stringify({
            release_tx_id: String(releaseTx.id),
            contract_id: String(contractId),
            job_id: String(c.job_id),
            from_client: String(c.client_id),
            freelancer_id: String(c.freelancer_id),
            gross_amount: gross,
            fee_pct: PLATFORM_FEE_PCT,
          }),
          c.job_id,
          contractId,
        ]
      );
      feeTx = feeTxR.rows[0];
    }

    // ✅ 6) contract & job completed
    await client.query(`UPDATE contracts SET status='completed', completed_at=NOW(), updated_at=NOW() WHERE id=$1`, [
      contractId,
    ]);

    await client.query(`UPDATE jobs SET status='completed', updated_at=NOW() WHERE id=$1`, [c.job_id]);

    // ✅ 7) Update profile stats
    // Freelancer: +1 completed job
    await client.query(
      `UPDATE freelancer_profiles SET completed_jobs = COALESCE(completed_jobs, 0) + 1, updated_at = NOW() WHERE user_id = $1`,
      [c.freelancer_id]
    );

    // Client: spent_total update (using gross amount)
    await client.query(
      `UPDATE client_profiles SET spent_total = COALESCE(spent_total, 0) + $1, updated_at = NOW() WHERE user_id = $2`,
      [gross, c.client_id]
    );

    await client.query("COMMIT");

    // ✅ Notify freelancer
    const io = req.app.get("io");
    createNotification(io, {
      userId: c.freelancer_id,
      type: 'contract_completed',
      title: 'Shartnoma yakunlandi!',
      message: `"${c.job_title || 'Loyiha'}" shartnomasi mijoz tomonidan yakunlandi va mablag' balansingizga o'tkazildi.`,
      relatedId: contractId,
      relatedType: 'contract',
      translationData: { jobTitle: c.job_title || 'Loyiha' }
    });

    return res.json({
      success: true,
      message: "Shartnoma yakunlandi! Escrow freelancerga o‘tdi, fee platformaga yechildi.",
      data: {
        gross_amount: gross,
        net_to_freelancer: net,
        fee_amount: fee,
        release_tx: releaseTx,
        fee_tx: feeTx,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("Complete contract error:", error);
    return res.status(500).json({
      success: false,
      message: "Shartnomani yakunlashda xato yuz berdi.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};



/**
 * POST /contracts/:id/cancel (client yoki freelancer)
 */
const cancelContract = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    const cRes = await client.query(
      `SELECT id, job_id, client_id, freelancer_id, status FROM contracts WHERE id=$1 LIMIT 1`,
      [id]
    );

    if (cRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Shartnoma topilmadi.' });
    }

    const c = cRes.rows[0];
    const isMember = c.client_id === userId || c.freelancer_id === userId;

    if (!isMember) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Ruxsat yo‘q.' });
    }

    if (normalizeStatus(c.status) !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Faqat active contract bekor qilinadi.' });
    }

    await client.query(
      `UPDATE contracts SET status='cancelled' WHERE id=$1`,
      [id]
    );

    // jobni cancelled qilamiz (xohlasangiz open qilib qaytarsangiz ham bo‘ladi)
    await client.query(
      `UPDATE jobs SET status='cancelled', updated_at=NOW() WHERE id=$1`,
      [c.job_id]
    );

    await client.query('COMMIT');

    // ✅ Notify other party
    const io = req.app.get("io");
    const otherPartyId = (userId === c.client_id) ? c.freelancer_id : c.client_id;
    const actorRole = (userId === c.client_id) ? 'Mijoz' : 'Freelancer';
    
    createNotification(io, {
      userId: otherPartyId,
      type: 'contract_cancelled',
      title: 'Shartnoma bekor qilindi',
      message: `${actorRole} "${c.job_title || 'Loyiha'}" shartnomasini bekor qildi.`,
      relatedId: id,
      relatedType: 'contract',
      translationData: { jobTitle: c.job_title || 'Loyiha', actorRole }
    });
    return res.json({ success: true, message: 'Shartnoma bekor qilindi!' });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Cancel contract error:', error);
    return res.status(500).json({
      success: false,
      message: 'Shartnomani bekor qilishda xato yuz berdi.',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * PUT /contracts/:id/milestone
 * DB: milestones(id, contract_id, status, submitted_at, approved_at)
 * Rule:
 * - freelancer -> submitted
 * - client -> approved / released
 */
const updateMilestone = async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const userId = req.user.id;

    const { milestone_id, status } = req.body;

    if (!milestone_id || !status) {
      return res.status(400).json({ success: false, message: 'milestone_id va status kerak.' });
    }

    const newStatus = normalizeStatus(status);
    const allowed = ['pending', 'submitted', 'approved', 'released'];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Milestone status noto‘g‘ri.' });
    }

    // contract member check
    const cRes = await pool.query(
      `SELECT client_id, freelancer_id FROM contracts WHERE id=$1 LIMIT 1`,
      [contractId]
    );
    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shartnoma topilmadi.' });
    }

    const c = cRes.rows[0];

    // milestone exists?
    const mRes = await pool.query(
      `SELECT id, status FROM milestones WHERE id=$1 AND contract_id=$2 LIMIT 1`,
      [milestone_id, contractId]
    );
    if (mRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Milestone topilmadi.' });
    }

    // permissions
    if (newStatus === 'submitted' && c.freelancer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Faqat freelancer submit qila oladi.' });
    }
    if (['approved', 'released'].includes(newStatus) && c.client_id !== userId) {
      return res.status(403).json({ success: false, message: 'Faqat client approve/release qila oladi.' });
    }

    const sets = [`status=$1`];
    const params = [newStatus];
    let i = 2;

    if (newStatus === 'submitted') sets.push(`submitted_at = NOW()`);
    if (newStatus === 'approved') sets.push(`approved_at = NOW()`);
    // released uchun alohida timestamp sizda yo‘q — kerak bo‘lsa qo‘shasiz

    params.push(milestone_id, contractId);

    const upd = await pool.query(
      `
      UPDATE milestones
      SET ${sets.join(', ')}
      WHERE id = $${i++} AND contract_id = $${i}
      RETURNING *
      `,
      params
    );

    return res.json({
      success: true,
      message: 'Milestone yangilandi!',
      data: { milestone: upd.rows[0] }
    });
  } catch (error) {
    console.error('Update milestone error:', error);
    return res.status(500).json({
      success: false,
      message: 'Milestoneni yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /contracts/:id/dispute
 * DB: disputes(raised_by, against_user, reason, evidence_files, status, raised_by_role, amount, currency, chat_id, contract_id)
 */
const createDispute = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: contractId } = req.params;
    const userId = req.user.id;
    const role = req.user.role; // client | freelancer | admin

    const { reason, evidence_files, amount, currency } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'reason kerak.' });
    }

    await client.query('BEGIN');

    const cRes = await client.query(
      `SELECT id, client_id, freelancer_id, status FROM contracts WHERE id=$1 LIMIT 1`,
      [contractId]
    );

    if (cRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Shartnoma topilmadi.' });
    }

    const c = cRes.rows[0];
    const isMember = c.client_id === userId || c.freelancer_id === userId;

    // admin ham dispute ochmasin (odatda userlar ochadi)
    if (!isMember) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Ruxsat yo‘q.' });
    }

    // existing open/in_review dispute on contract
    const existing = await client.query(
      `
      SELECT id
      FROM disputes
      WHERE contract_id = $1
        AND status IN ('open','in_review')
      LIMIT 1
      `,
      [contractId]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Bu contract uchun allaqachon dispute ochilgan.'
      });
    }

    const againstUser = c.client_id === userId ? c.freelancer_id : c.client_id;

    // chat_id (agar bor bo‘lsa)
    const chatRes = await client.query(
      `SELECT id FROM chats WHERE contract_id=$1 LIMIT 1`,
      [contractId]
    );
    const chatId = chatRes.rows[0]?.id || null;

    const filesJson = Array.isArray(evidence_files) ? evidence_files : [];

    const dIns = await client.query(
      `
      INSERT INTO disputes (
        raised_by,
        against_user,
        raised_by_role,
        reason,
        evidence_files,
        status,
        amount,
        currency,
        chat_id,
        contract_id,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,'open',$6,$7,$8,$9,NOW())
      RETURNING *
      `,
      [
        userId,
        againstUser,
        role,
        reason,
        JSON.stringify(filesJson),
        amount != null ? Number(amount) : null,
        currency || 'UZS',
        chatId,
        contractId
      ]
    );
    // contract -> disputed
    await client.query(
      `UPDATE contracts SET status='disputed' WHERE id=$1`,
      [contractId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Dispute ochildi!',
      data: { dispute: dIns.rows[0] }
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Create dispute error:', error);
    return res.status(500).json({
      success: false,
      message: 'Dispute ochishda xato yuz berdi.',
      error: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = {
  // createContract,
  getContracts,
  getContractById,
  getMyContracts,
  updateContract,
  completeContract,
  cancelContract,
  updateMilestone,
  createDispute
};
