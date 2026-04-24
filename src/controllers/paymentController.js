const pool = require("../db/pool");
const { createNotification } = require("./notificationController");

/* ================= HELPERS ================= */

async function ensureBalanceRow(userId) {
  await pool.query(
    `INSERT INTO user_balances (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

function toAmount(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

/* ================= GET PAYMENTS (admin: all, user: own) ================= */

const getPayments = async (req, res) => {
  try {
    const authUserId = req.user.id;
    const role = req.user.role;

    const {
      q = "",
      type,
      status,
      user_id,         // admin filter (optional)
      sort = "created_desc", // created_desc | created_asc | amount_desc | amount_asc
      page = 1,
      limit = 20,
    } = req.query;

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    const isAdmin = role === "admin" || role === "superadmin";

    // WHERE
    let where = "WHERE 1=1";
    const params = [];
    let i = 1;

    // user scope
    if (!isAdmin) {
      where += ` AND user_id = $${i++}`;
      params.push(authUserId);
    } else {
      // admin bo'lsa: xohlasa user_id bo'yicha filtr qilsin
      if (user_id) {
        where += ` AND user_id = $${i++}`;
        params.push(user_id);
      }
    }

    if (type) {
      where += ` AND type = $${i++}`;
      params.push(type);
    }

    if (status) {
      where += ` AND status = $${i++}`;
      params.push(status);
    }

    // server-side search
    const qs = String(q || "").trim();
    if (qs) {
      where += `
        AND (
          id::text ILIKE $${i}
          OR type ILIKE $${i}
          OR status ILIKE $${i}
          OR COALESCE(gateway,'') ILIKE $${i}
          OR COALESCE(currency,'') ILIKE $${i}
          OR amount::text ILIKE $${i}
        )
      `;
      params.push(`%${qs}%`);
      i++;
    }

    // SORT whitelist
    let orderBy = "created_at DESC";
    if (sort === "created_asc") orderBy = "created_at ASC";
    if (sort === "amount_desc") orderBy = "amount DESC";
    if (sort === "amount_asc") orderBy = "amount ASC";

    // COUNT
    const count = await pool.query(
      `SELECT COUNT(*)::int AS c FROM transactions ${where}`,
      params
    );

    // LIST
    const list = await pool.query(
      `
      SELECT 
        t.*,
        j.title as job_title,
        c.id as contract_uuid
      FROM transactions t
      LEFT JOIN jobs j ON j.id = t.job_id
      LEFT JOIN contracts c ON c.id = t.contract_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, l, offset]
    );

    return res.json({
      success: true,
      data: {
        transactions: list.rows,
        pagination: {
          page: p,
          limit: l,
          total: count.rows[0].c,
          totalPages: Math.ceil(count.rows[0].c / l),
        },
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: "Payment list error", error: e.message });
  }
};
  

/* ================= BALANCE ================= */

const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureBalanceRow(userId);

    const r = await pool.query(
      "SELECT * FROM user_balances WHERE user_id = $1",
      [userId]
    );

    res.json({ success: true, data: { balance: r.rows[0] } });
  } catch (e) {
    res.status(500).json({ success: false, message: "Balance error", error: e.message });
  }
};

/* ================= DEPOSIT ================= */

// paymentController.js
const deposit = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { amount, gateway = "payme", currency = "UZS" } = req.body;

    const a = toAmount(amount);
    if (!a || a <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    await client.query("BEGIN");

    // 1) user_balances row borligiga ishonch
    await client.query(
      `INSERT INTO user_balances (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // 2) transactionni DARROV completed qilib yozamiz
    const txRes = await client.query(
      `
      INSERT INTO transactions (
        user_id,
        type,
        amount,
        currency,
        gateway,
        status,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1,'deposit',$2,$3,$4,'completed',$5,NOW(),NOW())
      RETURNING *
      `,
      [
        userId,
        a,
        currency,
        gateway,
        JSON.stringify({
          auto: true,
          note: "auto-completed deposit (dev mode)",
        }),
      ]
    );

    const tx = txRes.rows[0];

    // 3) balancega pul qo‘shamiz
    await client.query(
      `
      UPDATE user_balances
      SET available_balance = COALESCE(available_balance,0) + $1,
          updated_at = NOW()
      WHERE user_id = $2
      `,
      [a, userId]
    );

    await client.query("COMMIT");

    // Notify user (background)
    const io = req.app.get("io");
    createNotification(io, {
      userId,
      type: 'payment_received',
      title: 'Hisob to\'ldirildi',
      message: `${a.toLocaleString()} UZS miqdoridagi mablag' hisobingizga muvaffaqiyatli kelib tushdi.`,
      relatedId: tx.id,
      relatedType: 'transaction',
      translationData: { amount: a.toLocaleString() }
    });

    return res.status(201).json({
      success: true,
      message: "Deposit muvaffaqiyatli amalga oshirildi (auto).",
      data: {
        transaction: tx,
        balance_added: a,
      },
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Deposit error:", e);
    return res.status(500).json({
      success: false,
      message: "Deposit error",
      error: e.message,
    });
  } finally {
    client.release();
  }
};


/* ================= WITHDRAW ================= */

const withdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancer" });
    }

    const { amount, currency = "UZS", gateway = "card" } = req.body;
    const a = toAmount(amount);

    if (!a || a <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    await ensureBalanceRow(userId);

    await pool.query("BEGIN");

    const bal = await pool.query(
      `SELECT available_balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (Number(bal.rows[0].available_balance) < a) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const tx = await pool.query(
      `
      INSERT INTO transactions (user_id,type,amount,currency,gateway,status,metadata)
      VALUES ($1,'withdrawal',$2,$3,$4,'pending',$5)
      RETURNING *
      `,
      [userId, a, currency, gateway, { requested: true }]
    );

    await pool.query(
      `
      UPDATE user_balances
      SET available_balance = available_balance - $1,
          reserved_balance  = reserved_balance + $1,
          updated_at = NOW()
      WHERE user_id = $2
      `,
      [a, userId]
    );

    await pool.query("COMMIT");

    // Notify user (background)
    const io = req.app.get("io");
    createNotification(io, {
      userId,
      type: 'withdrawal_request',
      title: 'Yechib olish so\'rovi',
      message: `${a.toLocaleString()} UZS miqdoridagi mablag'ni yechib olish uchun so'rovingiz qabul qilindi.`,
      relatedId: tx.rows[0].id,
      relatedType: 'transaction',
      translationData: { amount: a.toLocaleString() }
    });

    res.status(201).json({ success: true, data: { transaction: tx.rows[0] } });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    res.status(500).json({ success: false, message: "Withdraw error", error: e.message });
  }
};

/* ================= WEBHOOK ================= */

const paymentWebhook = async (req, res) => {
  try {
    const { transaction_id, status } = req.body;
    if (!transaction_id || !status) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const txR = await pool.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    if (!txR.rows.length) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const tx = txR.rows[0];
    if (tx.status === status) {
      return res.json({ success: true, message: "No-op" });
    }

    await ensureBalanceRow(tx.user_id);
    await pool.query("BEGIN");

    await pool.query(
      `UPDATE transactions SET status=$1, updated_at=NOW() WHERE id=$2`,
      [status, tx.id]
    );

    const amt = Number(tx.amount);

    if (tx.type === "deposit" && status === "completed") {
      await pool.query(
        `UPDATE user_balances SET available_balance = available_balance + $1 WHERE user_id = $2`,
        [amt, tx.user_id]
      );
    }

    if (tx.type === "withdrawal" && status === "completed") {
      await pool.query(
        `UPDATE user_balances SET reserved_balance = reserved_balance - $1 WHERE user_id = $2`,
        [amt, tx.user_id]
      );
    }

    await pool.query("COMMIT");
    res.json({ success: true });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    res.status(500).json({ success: false, message: "Webhook error", error: e.message });
  }
};

const escrowHold = async (req, res) => {
  try {
    const clientId = req.user.id;
    const { contract_id, milestone_id, amount, currency = "UZS" } = req.body;

    const a = Number(amount);
    if (!a || a <= 0) {
      return res.status(400).json({ success: false, message: "Summa noto'g'ri." });
    }

    const cR = await pool.query(
      "SELECT client_id, freelancer_id FROM contracts WHERE id = $1",
      [contract_id]
    );
    if (cR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Shartnoma topilmadi." });
    }
    const c = cR.rows[0];
    if (c.client_id !== clientId) {
      return res.status(403).json({ success: false, message: "Siz bu shartnomaning egasi emassiz." });
    }

    await ensureBalanceRow(clientId);

    const bR = await pool.query(
      "SELECT available_balance FROM user_balances WHERE user_id = $1",
      [clientId]
    );
    const available = Number(bR.rows[0]?.available_balance ?? 0);
    if (available < a) {
      return res.status(400).json({ success: false, message: "Balansda yetarli mablag' yo'q." });
    }

    await pool.query("BEGIN");
    try {
      await pool.query(
        `UPDATE user_balances
         SET available_balance = available_balance - $1,
             escrow_balance = escrow_balance + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [a, clientId]
      );

      const txR = await pool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata)
         VALUES ($1, 'escrow_hold', $2, $3, 'internal', 'completed', $4)
         RETURNING *`,
        [clientId, a, currency, JSON.stringify({ contract_id, milestone_id: milestone_id || null })]
      );

      await pool.query("COMMIT");

      // Notify client (background)
      const io = req.app.get("io");
      createNotification(io, {
        userId: clientId,
        type: 'escrow_hold',
        title: 'Mablag\' band qilindi',
        message: `${a.toLocaleString()} UZS miqdoridagi mablag' shartnoma uchun escrow hamyoningizda band qilindi.`,
        relatedId: txR.rows[0].id,
        relatedType: 'transaction',
        translationData: { amount: a.toLocaleString() }
      });

      return res.status(201).json({
        success: true,
        message: "Mablag' escrowga band qilindi.",
        data: { transaction: txR.rows[0] },
      });
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  } catch (error) {
    console.error("Escrow hold error:", error);
    return res.status(500).json({
      success: false,
      message: "Escrow qilishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /payments/contracts/:id/release
 * Escrow -> freelancer payout + platform fee
 *
 * IMPORTANT:
 * - client escrow_balance kamayadi (available emas)
 * - freelancer payout = amount - fee
 * - platform fee balance + fee
 * - transactions:
 *    - escrow_release (amount = full amount)
 *    - fee (amount = fee)
 */
const releaseMilestone = async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const clientId = req.user.id;

    const { milestone_id, amount, currency = "UZS" } = req.body;

    const a = Number(amount);
    if (!a || a <= 0) {
      return res.status(400).json({ success: false, message: "Summa noto'g'ri." });
    }
    if (!milestone_id) {
      return res.status(400).json({ success: false, message: "milestone_id majburiy (idempotency uchun)." });
    }

    const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID;
    const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT || 0);

    if (!PLATFORM_USER_ID) {
      return res.status(500).json({
        success: false,
        message: "PLATFORM_USER_ID .env da yo'q. Platform fee yozish uchun kerak.",
      });
    }

    // contract tekshir
    const contractR = await pool.query(
      "SELECT client_id, freelancer_id FROM contracts WHERE id = $1",
      [contractId]
    );
    if (contractR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Shartnoma topilmadi." });
    }
    const contract = contractR.rows[0];
    if (contract.client_id !== clientId) {
      return res.status(403).json({ success: false, message: "Siz bu shartnomaning egasi emassiz." });
    }

    // fee hisoblash (UZS integer logika bo'lsa: Math.round)
    const feeAmount = Math.max(0, Math.round((a * PLATFORM_FEE_PCT) / 100));
    const netToFreelancer = Math.max(0, a - feeAmount);

    await pool.query("BEGIN");
    try {
      // 1) Idempotent: bu milestone uchun release oldin bo'lganmi?
      const existingReleaseR = await pool.query(
        `
        SELECT *
        FROM transactions
        WHERE type='escrow_release'
          AND status='completed'
          AND (metadata->>'contract_id') = $1
          AND (metadata->>'milestone_id') = $2
        LIMIT 1
        `,
        [String(contractId), String(milestone_id)]
      );

      if (existingReleaseR.rows.length > 0) {
        const releaseTx = existingReleaseR.rows[0];

        // fee ham topib beramiz (bo'lsa)
        const feeTxR = await pool.query(
          `
          SELECT *
          FROM transactions
          WHERE type='fee'
            AND status='completed'
            AND (metadata->>'release_tx_id') = $1
          LIMIT 1
          `,
          [String(releaseTx.id)]
        );

        await pool.query("COMMIT");
        return res.json({
          success: true,
          message: "Avval release qilingan (idempotent).",
          data: { release: releaseTx, fee: feeTxR.rows[0] || null },
        });
      }

      // 2) Balance row ensure (client, freelancer, platform)
      await pool.query(
        `INSERT INTO user_balances (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [clientId]
      );
      await pool.query(
        `INSERT INTO user_balances (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [contract.freelancer_id]
      );
      await pool.query(
        `INSERT INTO user_balances (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [PLATFORM_USER_ID]
      );

      // 3) Client escrow yetarlimi? (FOR UPDATE bilan lock)
      const escrowR = await pool.query(
        `SELECT escrow_balance
         FROM user_balances
         WHERE user_id = $1
         FOR UPDATE`,
        [clientId]
      );
      const escrowBal = Number(escrowR.rows[0]?.escrow_balance ?? 0);
      if (escrowBal < a) {
        await pool.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Escrow balansda yetarli mablag' yo'q (avval hold qiling).",
        });
      }

      // 4) Client escrowdan TO'LIQ amount ketadi
      await pool.query(
        `UPDATE user_balances
         SET escrow_balance = escrow_balance - $1,
             total_spent = COALESCE(total_spent,0) + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [a, clientId]
      );

      // 5) Freelancerga NET tushadi (amount - fee)
      if (netToFreelancer > 0) {
        await pool.query(
          `UPDATE user_balances
           SET available_balance = available_balance + $1,
               total_earned = COALESCE(total_earned,0) + $1,
               updated_at = NOW()
           WHERE user_id = $2`,
          [netToFreelancer, contract.freelancer_id]
        );
      }

      // 6) Platform userga fee tushadi
      if (feeAmount > 0) {
        await pool.query(
          `UPDATE user_balances
           SET available_balance = available_balance + $1,
               updated_at = NOW()
           WHERE user_id = $2`,
          [feeAmount, PLATFORM_USER_ID]
        );
      }

      // 7) Escrow release ledger (freelancer user_id bilan)
      const releaseTxR = await pool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata)
         VALUES ($1, 'escrow_release', $2, $3, 'internal', 'completed', $4)
         RETURNING *`,
        [
          contract.freelancer_id,
          netToFreelancer, // IMPORTANT: ledgerda freelancer olgan NET turadi
          currency,
          JSON.stringify({
            contract_id: String(contractId),
            milestone_id: String(milestone_id),
            from_client: String(clientId),
            gross_amount: a,
            fee_amount: feeAmount,
            fee_pct: PLATFORM_FEE_PCT,
          }),
        ]
      );

      const releaseTx = releaseTxR.rows[0];

      // 8) Fee ledger (platform user_id bilan) — releaseTx ga bog'lanadi
      let feeTx = null;
      if (feeAmount > 0) {
        // idempotent: releaseTx uchun fee bor-yo'qligini tekshir
        const existingFeeR = await pool.query(
          `
          SELECT *
          FROM transactions
          WHERE type='fee'
            AND status='completed'
            AND (metadata->>'release_tx_id') = $1
          LIMIT 1
          `,
          [String(releaseTx.id)]
        );

        if (existingFeeR.rows.length > 0) {
          feeTx = existingFeeR.rows[0];
        } else {
          const feeTxR = await pool.query(
            `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata)
             VALUES ($1, 'fee', $2, $3, 'internal', 'completed', $4)
             RETURNING *`,
            [
              PLATFORM_USER_ID,
              feeAmount,
              currency,
              JSON.stringify({
                release_tx_id: String(releaseTx.id),
                contract_id: String(contractId),
                milestone_id: String(milestone_id),
                from_client: String(clientId),
                freelancer_id: String(contract.freelancer_id),
                gross_amount: a,
                fee_pct: PLATFORM_FEE_PCT,
              }),
            ]
          );
          feeTx = feeTxR.rows[0];
        }
      }

      await pool.query("COMMIT");

      // Notify both parties (background)
      const io = req.app.get("io");
      
      // Notify Client (Debit)
      createNotification(io, {
        userId: clientId,
        type: 'payment_sent',
        title: 'To\'lov o\'tkazildi',
        message: `Freelancerga ${a.toLocaleString()} UZS miqdoridagi to'lov muvaffaqiyatli o'tkazildi.`,
        relatedId: releaseTx.id,
        relatedType: 'transaction',
        translationData: { amount: a.toLocaleString() }
      });

      // Notify Freelancer (Credit)
      createNotification(io, {
        userId: contract.freelancer_id,
        type: 'payment_received',
        title: 'To\'lov qabul qilindi',
        message: `Sizga ${netToFreelancer.toLocaleString()} UZS miqdoridagi to'lov kelib tushdi.`,
        relatedId: releaseTx.id,
        relatedType: 'transaction',
        translationData: { amount: netToFreelancer.toLocaleString() }
      });

      return res.json({
        success: true,
        message: "Escrowdan freelancerga yechildi (fee bilan)!",
        data: {
          release: releaseTx,
          fee: feeTx,
          gross_amount: a,
          net_to_freelancer: netToFreelancer,
          fee_amount: feeAmount,
          fee_pct: PLATFORM_FEE_PCT,
        },
      });
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  } catch (error) {
    console.error("Release milestone error:", error);
    return res.status(500).json({
      success: false,
      message: "To'lovni o'tkazishda xato yuz berdi.",
      error: error.message,
    });
  }
};


const getPaymentDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { id } = req.params;

    // 1) transactionni olamiz
    const txR = await pool.query(
      `SELECT *
       FROM transactions
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (txR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction topilmadi." });
    }

    const tx = txR.rows[0];

    // 2) permission (admin bo'lsa hammasini ko'radi)
    const isAdmin = role === "admin" || role === "superadmin";
    if (!isAdmin && String(tx.user_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Ruxsat yo'q." });
    }

    // 3) metadata dan client/freelancer idlar
    const meta = tx.metadata || {};
    const fromClientId = meta.from_client || null;
    const freelancerId = meta.freelancer_id || null;

    // 4) user larni yig'amiz (owner + client + freelancer)
    const ids = [tx.user_id, fromClientId, freelancerId].filter(Boolean);

    let usersById = {};
    if (ids.length) {
      const usersR = await pool.query(
        `
        SELECT
          id,
          first_name,
          last_name,
          username,
          email,
          phone,
          role
        FROM users
        WHERE id = ANY($1::uuid[])
        `,
        [ids]
      );

      usersById = Object.fromEntries(usersR.rows.map((u) => [String(u.id), u]));
    }

    return res.json({
      success: true,
      data: {
        transaction: tx,
        users: {
          owner: usersById[String(tx.user_id)] || null,
          client: fromClientId ? usersById[String(fromClientId)] || null : null,
          freelancer: freelancerId ? usersById[String(freelancerId)] || null : null,
        },
      },
    });
  } catch (error) {
    console.error("Get payment detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Transaction detail olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/* ================= USER CARDS ================= */

const getCards = async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(
      "SELECT * FROM user_cards WHERE user_id = $1 ORDER BY is_main DESC, created_at DESC",
      [userId]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ success: false, message: "Cards error", error: e.message });
  }
};

const addCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { card_number, card_holder, expiry_date, card_type = "uzcard" } = req.body;

    if (!card_number || !card_holder || !expiry_date) {
      return res.status(400).json({ success: false, message: "Kartaga oid barcha ma'lumotlar majburiy." });
    }

    // Har bir userda max 5 ta karta bo'lsin
    const countR = await pool.query("SELECT COUNT(*)::int as c FROM user_cards WHERE user_id = $1", [userId]);
    if (countR.rows[0].c >= 5) {
      return res.status(400).json({ success: false, message: "Maksimal 5 ta karta qo'shish mumkin." });
    }

    // Agar bu birinchi karta bo'lsa is_main=true
    const isMain = countR.rows[0].c === 0;

    const r = await pool.query(
      `INSERT INTO user_cards (user_id, card_number, card_holder, expiry_date, card_type, is_main)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, card_number, card_holder, expiry_date, card_type, isMain]
    );

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: "Add card error", error: e.message });
  }
};

const deleteCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const r = await pool.query(
      "DELETE FROM user_cards WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Karta topilmadi." });
    }

    res.json({ success: true, message: "Karta o'chirildi." });
  } catch (e) {
    res.status(500).json({ success: false, message: "Delete card error", error: e.message });
  }
};

/* ================= EXPORT ================= */

module.exports = {
  getPayments,
  getBalance,
  deposit,
  withdraw,
  paymentWebhook,
  escrowHold,
  releaseMilestone,
  getPaymentDetail,
  getCards,
  addCard,
  deleteCard,
};
