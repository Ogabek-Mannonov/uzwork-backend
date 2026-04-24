const pool = require("../db/pool");
const { createNotification } = require("./notificationController");

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

    const mQ = await client.query(
      `
      SELECT
        m.id, m.contract_id, m.status, m.amount,
        c.freelancer_id, c.client_id, c.status AS contract_status
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

    if (String(m.client_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Bu milestone sizning contract’ga tegishli emas." });
    }

    if (String(m.contract_status) !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Contract active emas." });
    }

    if (String(m.status) !== "submitted") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Faqat submitted milestone approve qilinadi." });
    }

    const up = await client.query(
      `
      UPDATE milestones
      SET status = 'approved',
          approved_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    await client.query("COMMIT");
    return res.json({ success: true, data: { milestone: up.rows[0] } });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("approveMilestone error:", e);
    return res.status(500).json({ success: false, message: "Approveda xato.", error: e.message });
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

    // ensure balances
    await ensureBalanceRow(client, m.client_id);
    await ensureBalanceRow(client, m.freelancer_id);

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

    // lock freelancer balance
    await client.query(
      `
      SELECT available_balance, escrow_balance
      FROM user_balances
      WHERE user_id = $1
      FOR UPDATE
      `,
      [m.freelancer_id]
    );

    // move funds: client escrow -> freelancer available
    await client.query(
      `
      UPDATE user_balances
      SET escrow_balance = COALESCE(escrow_balance,0) - $1,
          updated_at = NOW()
      WHERE user_id = $2
      `,
      [amt, m.client_id]
    );

    await client.query(
      `
      UPDATE user_balances
      SET available_balance = COALESCE(available_balance,0) + $1,
          updated_at = NOW()
      WHERE user_id = $2
      `,
      [amt, m.freelancer_id]
    );

    // transaction log (escrow_release)
    await client.query(
      `
      INSERT INTO transactions (
        user_id, type, amount, currency, gateway, status,
        metadata, job_id, contract_id, created_at, updated_at
      )
      VALUES ($1,'escrow_release',$2,'UZS','internal','completed',$3,$4,$5,NOW(),NOW())
      `,
      [
        m.freelancer_id,
        amt,
        JSON.stringify({
          milestone_id: String(m.id),
          contract_id: String(m.contract_id),
          from_client_id: String(m.client_id),
          to_freelancer_id: String(m.freelancer_id),
          reason: "milestone_release",
        }),
        m.job_id,
        m.contract_id,
      ]
    );

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

module.exports = { submitMilestone, approveMilestone, releaseMilestone };
