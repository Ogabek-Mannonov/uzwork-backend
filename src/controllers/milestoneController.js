const pool = require("../db/pool");
const { createNotification } = require("./notificationController");
const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID;
const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT || 0);

const normalizeRole = (r) => String(r || "").toLowerCase();

async function ensureBalanceRow(qClient, userId) {
  await qClient.query(
    `INSERT INTO user_balances (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

// =========================
// POST /milestones/:id/submit
// freelancer milestone ishni topshiradi
// allowed: pending -> submitted
// =========================
const submitMilestone = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = normalizeRole(req.user.role);

    if (role !== "freelancer") {
      return res.status(403).json({ success: false, message: "Faqat freelancer submit qiladi." });
    }

    await client.query("BEGIN");

    // milestone + contract lock
    const mQ = await client.query(
      `
      SELECT
        m.id, m.contract_id, m.status, m.amount, m.title AS milestone_name,
        c.freelancer_id, c.client_id, c.status AS contract_status,
        j.title AS job_title
      FROM milestones m
      JOIN contracts c ON c.id = m.contract_id
      JOIN jobs j ON j.id = c.job_id
      WHERE m.id = $1
      FOR UPDATE
      `,
      [id]
    );


    if (mQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Milestone topilmadi." });
    }

    const m = mQ.rows[0];

    if (String(m.freelancer_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Bu milestone sizga tegishli emas." });
    }

    if (String(m.contract_status) !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Contract active emas." });
    }

    if (String(m.status) !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Faqat pending milestone submit qilinadi." });
    }

    const up = await client.query(
      `
      UPDATE milestones
      SET status = 'submitted',
          submitted_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    await client.query("COMMIT");

    // ✅ Notify client
    const io = req.app.get("io");
    createNotification(io, {
      userId: m.client_id,
      type: 'milestone_submitted',
      title: 'Milestone topshirildi',
      message: `Freelancer ishni topshirdi va to'lovni yechishni so'radi.`,
      relatedId: m.contract_id,
      relatedType: 'contract',
      translationData: { jobTitle: m.job_title || '', milestoneName: m.milestone_name || '' }
    });

    return res.json({ success: true, data: { milestone: up.rows[0] } });

  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("submitMilestone error:", e);
    return res.status(500).json({ success: false, message: "Submitda xato.", error: e.message });
  } finally {
    client.release();
  }
};

// =========================
// POST /milestones/:id/approve
// client milestone qabul qiladi
// allowed: submitted -> approved
// =========================
const approveMilestone = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = normalizeRole(req.user.role);

    if (role !== "client") {
      return res.status(403).json({ success: false, message: "Faqat client approve qiladi." });
    }

    await client.query("BEGIN");

    // 1) Milestone + Contract + Job lock
    const mQ = await client.query(
      `
      SELECT
        m.id, m.contract_id, m.status, m.amount, m.title AS milestone_name,
        c.freelancer_id, c.client_id, c.job_id, c.status AS contract_status,
        j.title AS job_title
      FROM milestones m
      JOIN contracts c ON c.id = m.contract_id
      JOIN jobs j ON j.id = c.job_id
      WHERE m.id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (mQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Milestone topilmadi." });
    }

    const m = mQ.rows[0];

    if (String(m.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Bu milestone sizga tegishli emas." });
    }

    if (String(m.status) !== "submitted") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Faqat topshirilgan (submitted) ishni tasdiqlash mumkin." });
    }

    const amt = Number(m.amount || 0);
    const fee = Math.max(0, Math.round((amt * PLATFORM_FEE_PCT) / 100));
    const net = Math.max(0, amt - fee);

    // 2) Release Funds: Client Escrow -> Freelancer Available + Platform Fee
    if (!PLATFORM_USER_ID) {
      await client.query("ROLLBACK");
      return res.status(500).json({ success: false, message: "PLATFORM_USER_ID .env da yo'q." });
    }

    // Ensure balance rows exist
    await ensureBalanceRow(client, m.client_id);
    await ensureBalanceRow(client, m.freelancer_id);
    await ensureBalanceRow(client, PLATFORM_USER_ID);

    // Check client escrow
    const cBal = await client.query(
      `SELECT escrow_balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
      [m.client_id]
    );
    const escrow = Number(cBal.rows[0]?.escrow_balance ?? 0);
    if (escrow < amt) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Mijozning escrow balansida mablag' yetarli emas." });
    }

    // Move funds
    // Client escrowdan to'liq amount yechiladi
    await client.query(
      `UPDATE user_balances SET escrow_balance = escrow_balance - $1, total_spent = COALESCE(total_spent,0) + $1, updated_at = NOW() WHERE user_id = $2`,
      [amt, m.client_id]
    );

    // Freelancerga net tushadi
    if (net > 0) {
      await client.query(
        `UPDATE user_balances SET available_balance = available_balance + $1, total_earned = COALESCE(total_earned,0) + $1, updated_at = NOW() WHERE user_id = $2`,
        [net, m.freelancer_id]
      );
    }

    // Platformaga fee tushadi
    if (fee > 0) {
      await client.query(
        `UPDATE user_balances SET available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [fee, PLATFORM_USER_ID]
      );
    }

    // Log transaction (escrow_release - freelancer olgan net)
    const releaseTx = await client.query(
      `
      INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, job_id, contract_id, created_at, updated_at)
      VALUES ($1, 'escrow_release', $2, 'UZS', 'internal', 'completed', $3, $4, $5, NOW(), NOW())
      RETURNING id
      `,
      [
        m.freelancer_id, net,
        JSON.stringify({
          milestone_id: id,
          contract_id: m.contract_id,
          from_client: m.client_id,
          gross_amount: amt,
          fee_amount: fee,
          fee_pct: PLATFORM_FEE_PCT,
          reason: "milestone_approved"
        }),
        m.job_id, m.contract_id
      ]
    );

    // Log fee transaction
    if (fee > 0) {
      await client.query(
        `
        INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, job_id, contract_id, created_at, updated_at)
        VALUES ($1, 'fee', $2, 'UZS', 'internal', 'completed', $3, $4, $5, NOW(), NOW())
        `,
        [
          PLATFORM_USER_ID, fee,
          JSON.stringify({
            release_tx_id: releaseTx.rows[0].id,
            contract_id: m.contract_id,
            milestone_id: id,
            from_client: m.client_id,
            freelancer_id: m.freelancer_id,
            gross_amount: amt,
            fee_pct: PLATFORM_FEE_PCT
          }),
          m.job_id, m.contract_id
        ]
      );
    }

    // 3) Update Milestone status
    const up = await client.query(
      `UPDATE milestones SET status = 'released', approved_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    // 4) Check if all milestones are done -> Complete Contract
    const remainingQ = await client.query(
      `SELECT COUNT(*) FROM milestones WHERE contract_id = $1 AND status NOT IN ('released', 'cancelled')`,
      [m.contract_id]
    );
    const remaining = parseInt(remainingQ.rows[0].count, 10);

    let contractCompleted = false;
    if (remaining === 0) {
      await client.query(`UPDATE contracts SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`, [m.contract_id]);
      await client.query(`UPDATE jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`, [m.job_id]);
      contractCompleted = true;
    }

    // 5) Update related chat messages metadata
    const msgUpdate = await client.query(
      `
      UPDATE messages
      SET metadata = (metadata::jsonb || '{"status": "approved"}'::jsonb)
      WHERE (metadata::jsonb->>'milestone_id')::text = $1::text
      RETURNING id, chat_id, metadata
      `,
      [id]
    );

    await client.query("COMMIT");

    // 6) Notifications & Sockets
    const io = req.app.get("io");
    if (io) {
      // Chat update
      if (msgUpdate.rows.length > 0) {
        msgUpdate.rows.forEach(row => {
          io.to(row.chat_id).emit("messageEdited", {
            messageId: row.id,
            metadata: row.metadata,
            updated_at: new Date()
          });
        });
      }

      // Notification to freelancer
      const { createNotification } = require("./notificationController");
      createNotification(io, {
        userId: m.freelancer_id,
        type: contractCompleted ? 'contract_completed' : 'milestone_approved',
        title: contractCompleted ? 'Loyiha yakunlandi!' : 'Milestone tasdiqlandi!',
        message: contractCompleted 
          ? `"${m.job_title}" loyihasi to'liq yakunlandi va so'nggi to'lov o'tkazildi.` 
          : `"${m.milestone_name}" bosqichi tasdiqlandi va ${amt} so'm balansingizga o'tkazildi.`,
        relatedId: m.contract_id,
        relatedType: 'contract',
        translationData: { jobTitle: m.job_title || '', milestoneName: m.milestone_name || '' }
      });
    }

    return res.json({ 
      success: true, 
      message: contractCompleted ? "Shartnoma yakunlandi va pul o'tkazildi." : "Milestone tasdiqlandi va pul o'tkazildi.",
      data: { milestone: up.rows[0], contractCompleted } 
    });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("approveMilestone error:", e);
    return res.status(500).json({ success: false, message: "Tasdiqlashda xato yuz berdi.", error: e.message });
  } finally {
    client.release();
  }
};

// =========================
// POST /milestones/:id/release
// escrowdan freelancerga pul o‘tkazadi
// allowed: approved -> released
// NOTE: bu payment hook. KECHAGI HOLD'GA TEGMAYDI.
// =========================
const releaseMilestone = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = normalizeRole(req.user.role);

    // hozircha admin yoki client qilib turamiz (xohlasang faqat admin qilamiz)
    if (!["admin", "client"].includes(role)) {
      return res.status(403).json({ success: false, message: "Release faqat admin/client." });
    }

    await client.query("BEGIN");

    // milestone + contract lock
    const mQ = await client.query(
      `
      SELECT
        m.id, m.contract_id, m.status, m.amount,
        c.freelancer_id, c.client_id, c.job_id, c.status AS contract_status
      FROM milestones m
      JOIN contracts c ON c.id = m.contract_id
      WHERE m.id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (mQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Milestone topilmadi." });
    }

    const m = mQ.rows[0];

    if (role === "client" && String(m.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Bu contract sizga tegishli emas." });
    }

    if (String(m.contract_status) !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Contract active emas." });
    }

    if (String(m.status) !== "approved") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Faqat approved milestone release qilinadi." });
    }

    const amt = Number(m.amount || 0);
    if (!amt || amt <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Milestone amount noto‘g‘ri." });
    }

    const fee = Math.max(0, Math.round((amt * PLATFORM_FEE_PCT) / 100));
    const net = Math.max(0, amt - fee);

    if (!PLATFORM_USER_ID) {
      await client.query("ROLLBACK");
      return res.status(500).json({ success: false, message: "PLATFORM_USER_ID .env da yo'q." });
    }

    // ensure balances
    await ensureBalanceRow(client, m.client_id);
    await ensureBalanceRow(client, m.freelancer_id);
    await ensureBalanceRow(client, PLATFORM_USER_ID);

    // lock client balance
    const cBal = await client.query(
      `
      SELECT available_balance, escrow_balance
      FROM user_balances
      WHERE user_id = $1
      FOR UPDATE
      `,
      [m.client_id]
    );

    const escrow = Number(cBal.rows[0]?.escrow_balance ?? 0);
    if (escrow < amt) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Client escrow balance yetarli emas (hold yo‘q yoki yetmaydi).",
      });
    }

    // move funds: client escrow -> freelancer available + platform
    await client.query(
      `
      UPDATE user_balances
      SET escrow_balance = COALESCE(escrow_balance,0) - $1,
          updated_at = NOW()
      WHERE user_id = $2
      `,
      [amt, m.client_id]
    );

    if (net > 0) {
      await client.query(
        `
        UPDATE user_balances
        SET available_balance = COALESCE(available_balance,0) + $1,
            total_earned = COALESCE(total_earned,0) + $1,
            updated_at = NOW()
        WHERE user_id = $2
        `,
        [net, m.freelancer_id]
      );
    }

    if (fee > 0) {
      await client.query(
        `
        UPDATE user_balances
        SET available_balance = COALESCE(available_balance,0) + $1,
            updated_at = NOW()
        WHERE user_id = $2
        `,
        [fee, PLATFORM_USER_ID]
      );
    }

    // transaction log (escrow_release)
    const releaseTx = await client.query(
      `
      INSERT INTO transactions (
        user_id, type, amount, currency, gateway, status,
        metadata, job_id, contract_id, created_at, updated_at
      )
      VALUES ($1,'escrow_release',$2,'UZS','internal','completed',$3,$4,$5,NOW(),NOW())
      RETURNING id
      `,
      [
        m.freelancer_id,
        net,
        JSON.stringify({
          milestone_id: String(m.id),
          contract_id: String(m.contract_id),
          from_client_id: String(m.client_id),
          to_freelancer_id: String(m.freelancer_id),
          gross_amount: amt,
          fee_amount: fee,
          fee_pct: PLATFORM_FEE_PCT,
          reason: "milestone_release",
        }),
        m.job_id,
        m.contract_id,
      ]
    );

    if (fee > 0) {
      await client.query(
        `
        INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata, job_id, contract_id, created_at, updated_at)
        VALUES ($1, 'fee', $2, 'UZS', 'internal', 'completed', $3, $4, $5, NOW(), NOW())
        `,
        [
          PLATFORM_USER_ID, fee,
          JSON.stringify({
            release_tx_id: releaseTx.rows[0].id,
            contract_id: m.contract_id,
            milestone_id: String(m.id),
            from_client_id: String(m.client_id),
            freelancer_id: String(m.freelancer_id),
            gross_amount: amt,
            fee_pct: PLATFORM_FEE_PCT
          }),
          m.job_id, m.contract_id
        ]
      );
    }

    // milestone -> released
    const up = await client.query(
      `
      UPDATE milestones
      SET status = 'released'
      WHERE id = $1
      RETURNING *
      `,
      [m.id]
    );

    await client.query("COMMIT");
    return res.json({ success: true, message: "Milestone released, payment o‘tdi.", data: { milestone: up.rows[0] } });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("releaseMilestone error:", e);
    return res.status(500).json({ success: false, message: "Release’da xato.", error: e.message });
  } finally {
    client.release();
  }
};

// =========================
// POST /milestones/:id/reject
// client milestone'ni rad etadi (revision so'raydi)
// allowed: submitted -> pending
// =========================
const rejectMilestone = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    console.log("[rejectMilestone] Received id:", id);
    const { reason } = req.body;
    const userId = req.user.id;
    const role = normalizeRole(req.user.role);

    if (role !== "client") {
      return res.status(403).json({ success: false, message: "Faqat client rad qila oladi." });
    }

    await client.query("BEGIN");

    const mQ = await client.query(
      `
      SELECT
        m.id, m.contract_id, m.status, m.title AS milestone_name,
        c.freelancer_id, c.client_id, j.title AS job_title
      FROM milestones m
      JOIN contracts c ON c.id = m.contract_id
      JOIN jobs j ON j.id = c.job_id
      WHERE m.id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (mQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Milestone topilmadi." });
    }

    const m = mQ.rows[0];

    if (String(m.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Bu milestone sizga tegishli emas." });
    }

    if (String(m.status) !== "submitted") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Faqat topshirilgan (submitted) ishni rad qilish mumkin." });
    }

    const up = await client.query(
      `
      UPDATE milestones
      SET status = 'pending',
          submitted_at = NULL
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    // ✅ Update related chat messages metadata
    const msgUpdate = await client.query(
      `
      UPDATE messages
      SET metadata = (metadata::jsonb || '{"status": "rejected"}'::jsonb)
      WHERE (metadata::jsonb->>'milestone_id')::text = $1::text
      RETURNING id, chat_id, metadata
      `,
      [id]
    );

    await client.query("COMMIT");

    // ✅ Emit socket event for real-time UI update
    const io = req.app.get("io");
    if (io && msgUpdate.rows.length > 0) {
      msgUpdate.rows.forEach(row => {
        io.to(row.chat_id).emit("messageEdited", {
          messageId: row.id,
          metadata: row.metadata,
          updated_at: new Date()
        });
      });
    }

    // ✅ Notify freelancer
    createNotification(io, {
      userId: m.freelancer_id,
      type: 'milestone_rejected',
      title: 'Ish qabul qilinmadi',
      message: `Mijoz ishni rad etdi va tuzatish so'radi. Sabab: ${reason || 'Ko\'rsatilmadi'}`,
      relatedId: m.contract_id,
      relatedType: 'contract',
      translationData: { jobTitle: m.job_title || '', milestoneName: m.milestone_name || '', reason: reason || '' }
    });

    return res.json({ success: true, data: { milestone: up.rows[0] } });

  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("rejectMilestone error:", e);
    return res.status(500).json({ success: false, message: "Rad etishda xato.", error: e.message });
  } finally {
    client.release();
  }
};

module.exports = { submitMilestone, approveMilestone, releaseMilestone, rejectMilestone };
