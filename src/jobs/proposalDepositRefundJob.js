// src/jobs/proposalDepositRefundJob.js
const pool = require("../db/pool");
const { refundLockedToAvailable } = require("../services/walletService");

const HOURS = Number(process.env.PROPOSAL_DEPOSIT_REFUND_HOURS || 1);

async function runProposalDepositRefundJob() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // pending, viewed_at NULL, locked deposit, 48h o'tgan
    const q = await client.query(
      `
      SELECT id, freelancer_id, deposit_amount
      FROM proposals
      WHERE status = 'pending'
        AND deposit_status = 'locked'
        AND viewed_at IS NULL
        AND deposit_amount > 0
        AND created_at < NOW() - ($1 || ' hours')::interval
      FOR UPDATE
      LIMIT 200
      `,
      [`${HOURS} hours`]
    );

    for (const p of q.rows) {
      const amt = Number(p.deposit_amount || 0);
      if (!amt || amt <= 0) continue;

      const idemKey = `proposal_refund:${p.id}`; // bir xil bo'lsa 2 marta ishlamaydi
      await refundLockedToAvailable(client, {
        userId: p.freelancer_id,
        amount: amt,
        currency: "UZS",
        meta: { proposal_id: String(p.id), reason: "auto_refund_not_viewed" },
        idempotencyKey: idemKey,
      });

      await client.query(
        `UPDATE proposals
         SET deposit_status = 'refunded',
             updated_at = NOW()
         WHERE id = $1`,
        [p.id]
      );
    }

    await client.query("COMMIT");
    return { processed: q.rows.length };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("proposalDepositRefundJob error:", e);
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { runProposalDepositRefundJob };