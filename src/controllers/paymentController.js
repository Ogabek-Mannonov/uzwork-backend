// src/controllers/paymentController.js
const pool = require("../db/pool");

/**
 * Helper: ensure user_balances row exists
 */
async function ensureBalanceRow(userId) {
  await pool.query(
    `INSERT INTO user_balances (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

/**
 * Helper: safe numeric
 */
function toAmount(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * GET /payments
 * Transaction history (transactions table)
 * Query: ?type=deposit&status=completed&page=1&limit=20
 */
const getPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status, page = 1, limit = 20 } = req.query;

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    let where = "WHERE user_id = $1";
    const params = [userId];
    let i = 2;

    if (type) {
      where += ` AND type = $${i++}`;
      params.push(type);
    }
    if (status) {
      where += ` AND status = $${i++}`;
      params.push(status);
    }

    const countQ = `SELECT COUNT(*)::int AS c FROM transactions ${where}`;
    const countR = await pool.query(countQ, params);
    const total = countR.rows[0]?.c ?? 0;

    const listQ = `
      SELECT *
      FROM transactions
      ${where}
      ORDER BY created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;
    const listR = await pool.query(listQ, params.concat([l, offset]));

    return res.json({
      success: true,
      data: {
        transactions: listR.rows,
        pagination: {
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l),
        },
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return res.status(500).json({
      success: false,
      message: "To'lovlarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /payments/balance
 */
const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    await ensureBalanceRow(userId);

    const r = await pool.query("SELECT * FROM user_balances WHERE user_id = $1", [userId]);

    return res.json({
      success: true,
      data: { balance: r.rows[0] },
    });
  } catch (error) {
    console.error("Get balance error:", error);
    return res.status(500).json({
      success: false,
      message: "Balansni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /payments/deposit
 * Creates a pending deposit transaction.
 */
const deposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, gateway = "payme", currency = "UZS" } = req.body;

    const a = toAmount(amount);
    if (!a || a <= 0) {
      return res.status(400).json({ success: false, message: "To'lov summasi noto'g'ri." });
    }

    const r = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata)
       VALUES ($1, 'deposit', $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [userId, a, currency, gateway, JSON.stringify({ note: "deposit initiated" })]
    );

    return res.status(201).json({
      success: true,
      message: "Deposit yaratildi. To'lovni yakunlang.",
      data: {
        transaction: r.rows[0],
        payment_url: `https://payme.uz/checkout/${r.rows[0].id}`,
      },
    });
  } catch (error) {
    console.error("Deposit error:", error);
    return res.status(500).json({
      success: false,
      message: "To'lov yaratishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /payments/withdraw
 * Freelancer only.
 * Creates pending withdrawal transaction + moves available -> reserved
 */
const withdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "freelancer") {
      return res.status(403).json({
        success: false,
        message: "Faqat freelancerlar pul yechib olishi mumkin.",
      });
    }

    const { amount, gateway = "card", currency = "UZS" } = req.body;
    const a = toAmount(amount);

    if (!a || a <= 0) {
      return res.status(400).json({ success: false, message: "Summa noto'g'ri." });
    }

    await ensureBalanceRow(userId);

    const balR = await pool.query(
      "SELECT available_balance, reserved_balance FROM user_balances WHERE user_id = $1",
      [userId]
    );
    const available = Number(balR.rows[0]?.available_balance ?? 0);

    if (available < a) {
      return res.status(400).json({
        success: false,
        message: "Balansda yetarli mablag' yo'q.",
      });
    }

    await pool.query("BEGIN");
    try {
      const txR = await pool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, gateway, status, metadata)
         VALUES ($1, 'withdrawal', $2, $3, $4, 'pending', $5)
         RETURNING *`,
        [userId, a, currency, gateway, JSON.stringify({ note: "withdrawal requested" })]
      );

      await pool.query(
        `UPDATE user_balances
         SET available_balance = available_balance - $1,
             reserved_balance  = reserved_balance + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [a, userId]
      );

      await pool.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Yechib olish so'rovi yuborildi!",
        data: { transaction: txR.rows[0] },
      });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (error) {
    console.error("Withdraw error:", error);
    return res.status(500).json({
      success: false,
      message: "Pul yechib olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /payments/webhook
 * Public webhook: updates transaction status and updates balances for deposit/withdrawal
 */
const paymentWebhook = async (req, res) => {
  try {
    const { transaction_id, status, gateway, amount, currency } = req.body;

    if (!transaction_id || !status) {
      return res.status(400).json({
        success: false,
        message: "transaction_id va status majburiy.",
      });
    }

    let txR = await pool.query(
      "SELECT * FROM transactions WHERE gateway_transaction_id = $1 LIMIT 1",
      [transaction_id]
    );
    if (txR.rows.length === 0) {
      txR = await pool.query("SELECT * FROM transactions WHERE id = $1 LIMIT 1", [transaction_id]);
    }

    if (txR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction topilmadi." });
    }

    const tx = txR.rows[0];

    await pool.query("BEGIN");
    try {
      const lockR = await pool.query(
        "SELECT status, type, user_id, amount FROM transactions WHERE id = $1 FOR UPDATE",
        [tx.id]
      );
      const current = lockR.rows[0];

      const prevStatus = current.status;
      const nextStatus = status;

      await pool.query(
        `UPDATE transactions
         SET status = $1,
             gateway = COALESCE($2, gateway),
             currency = COALESCE($3, currency),
             amount = COALESCE($4, amount),
             gateway_transaction_id = COALESCE(gateway_transaction_id, $5),
             metadata = COALESCE(metadata,'{}'::jsonb) || $6::jsonb
         WHERE id = $7`,
        [
          nextStatus,
          gateway || null,
          currency || null,
          amount != null ? toAmount(amount) : null,
          transaction_id,
          JSON.stringify({ webhook_received: true, prev_status: prevStatus }),
          tx.id,
        ]
      );

      if (prevStatus === nextStatus) {
        await pool.query("COMMIT");
        return res.json({ success: true, message: "Webhook qabul qilindi (no-op)." });
      }

      await ensureBalanceRow(current.user_id);
      const amt = Number(current.amount);

      // deposit
      if (current.type === "deposit") {
        if (prevStatus !== "completed" && nextStatus === "completed") {
          await pool.query(
            `UPDATE user_balances
             SET available_balance = available_balance + $1,
                 updated_at = NOW()
             WHERE user_id = $2`,
            [amt, current.user_id]
          );
        }
        if (prevStatus === "completed" && nextStatus === "failed") {
          await pool.query(
            `UPDATE user_balances
             SET available_balance = GREATEST(available_balance - $1, 0),
                 updated_at = NOW()
             WHERE user_id = $2`,
            [amt, current.user_id]
          );
        }
      }

      // withdrawal
      if (current.type === "withdrawal") {
        if (prevStatus !== "completed" && nextStatus === "completed") {
          await pool.query(
            `UPDATE user_balances
             SET reserved_balance = GREATEST(reserved_balance - $1, 0),
                 updated_at = NOW()
             WHERE user_id = $2`,
            [amt, current.user_id]
          );
        }
        if (nextStatus === "failed" && prevStatus !== "failed") {
          await pool.query(
            `UPDATE user_balances
             SET reserved_balance = GREATEST(reserved_balance - $1, 0),
                 available_balance = available_balance + $1,
                 updated_at = NOW()
             WHERE user_id = $2`,
            [amt, current.user_id]
          );
        }
      }

      await pool.query("COMMIT");
      return res.json({ success: true, message: "Webhook qabul qilindi." });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (error) {
    console.error("Payment webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook qayta ishlashda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /payments/escrow/hold
 * Move client available -> escrow_balance
 */
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


module.exports = {
  getPayments,
  getBalance,
  deposit,
  withdraw,
  paymentWebhook,
  escrowHold,
  releaseMilestone,
  getPaymentDetail,
};
