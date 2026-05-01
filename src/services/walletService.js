// src/services/walletService.js
const pool = require("../db/pool");

// oddiy uuid regex (uuid paketi kerak emas)
const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const normalizeRole = (r) => String(r || "").toLowerCase();

async function ensureBalanceRow(client, userId) {
  if (!userId || !isUuid(String(userId))) {
    const err = new Error(`ensureBalanceRow: invalid userId uuid: ${userId}`);
    err.statusCode = 500;
    throw err;
  }

  await client.query(
    `INSERT INTO user_balances (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

// Idempotency: transaction already exists?
async function getTxByIdempotencyKey(client, key) {
  if (!key) return null;
  const r = await client.query(
    `SELECT * FROM transactions WHERE idempotency_key = $1 LIMIT 1`,
    [key]
  );
  return r.rows[0] || null;
}

/**
 * Move money inside wallet: available -> locked (proposal deposit lock)
 */
async function lockFromAvailableToLocked(client, { userId, amount, currency = "UZS", meta = {}, idempotencyKey }) {
  await ensureBalanceRow(client, userId);

  const existing = await getTxByIdempotencyKey(client, idempotencyKey);
  if (existing) return { tx: existing, idempotent: true };

  const balR = await client.query(
    `SELECT available_balance, locked_balance
     FROM user_balances
     WHERE user_id = $1
     FOR UPDATE`,
    [userId]
  );

  const available = Number(balR.rows[0]?.available_balance ?? 0);
  if (available < amount) {
    const err = new Error("wallet.insufficientBalance");
    err.statusCode = 400;
    throw err;
  }

  await client.query(
    `UPDATE user_balances
     SET available_balance = available_balance - $1,
         locked_balance = locked_balance + $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [amount, userId]
  );

  const txR = await client.query(
    `INSERT INTO transactions (
      user_id, type, amount, currency, gateway, status, metadata, idempotency_key, created_at, updated_at
    )
    VALUES ($1,'proposal_deposit_lock',$2,$3,'internal','completed',$4,$5,NOW(),NOW())
    RETURNING *`,
    [userId, amount, currency, JSON.stringify(meta), idempotencyKey || null]
  );

  return { tx: txR.rows[0], idempotent: false };
}

/**
 * Refund: locked -> available
 */
async function refundLockedToAvailable(client, { userId, amount, currency = "UZS", meta = {}, idempotencyKey }) {
  await ensureBalanceRow(client, userId);

  const existing = await getTxByIdempotencyKey(client, idempotencyKey);
  if (existing) return { tx: existing, idempotent: true };

  const balR = await client.query(
    `SELECT locked_balance
     FROM user_balances
     WHERE user_id = $1
     FOR UPDATE`,
    [userId]
  );
  const locked = Number(balR.rows[0]?.locked_balance ?? 0);
  if (locked < amount) {
    const err = new Error("wallet.lockedBalanceLow");
    err.statusCode = 400;
    throw err;
  }

  await client.query(
    `UPDATE user_balances
     SET locked_balance = locked_balance - $1,
         available_balance = available_balance + $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [amount, userId]
  );

  const txR = await client.query(
    `INSERT INTO transactions (
      user_id, type, amount, currency, gateway, status, metadata, idempotency_key, created_at, updated_at
    )
    VALUES ($1,'proposal_deposit_refund',$2,$3,'internal','completed',$4,$5,NOW(),NOW())
    RETURNING *`,
    [userId, amount, currency, JSON.stringify(meta), idempotencyKey || null]
  );

  return { tx: txR.rows[0], idempotent: false };
}

/**
 * Consume: locked -> platform available (platform revenue)
 * ✅ platformUserId endi param emas — envdan olinadi
 */
async function consumeLockedToPlatform(client, {
  userId,
  amount,
  currency = "UZS",
  meta = {},
  idempotencyKey,
}) {
  const platformUserId = process.env.PLATFORM_USER_ID;

  if (!platformUserId || !isUuid(String(platformUserId))) {
    const err = new Error(`PLATFORM_USER_ID missing/invalid: ${platformUserId}`);
    err.statusCode = 500;
    throw err;
  }

  await ensureBalanceRow(client, userId);
  await ensureBalanceRow(client, platformUserId);

  const existing = await getTxByIdempotencyKey(client, idempotencyKey);
  if (existing) return { tx: existing, idempotent: true };

  const balR = await client.query(
    `SELECT locked_balance
     FROM user_balances
     WHERE user_id = $1
     FOR UPDATE`,
    [userId]
  );
  const locked = Number(balR.rows[0]?.locked_balance ?? 0);
  if (locked < amount) {
    const err = new Error("wallet.lockedBalanceLow");
    err.statusCode = 400;
    throw err;
  }

  await client.query(
    `UPDATE user_balances
     SET locked_balance = locked_balance - $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [amount, userId]
  );

  await client.query(
    `UPDATE user_balances
     SET available_balance = available_balance + $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [amount, platformUserId]
  );

  const txR = await client.query(
    `INSERT INTO transactions (
      user_id, type, amount, currency, gateway, status, metadata, idempotency_key, created_at, updated_at
    )
    VALUES ($1,'proposal_deposit_consumed',$2,$3,'internal','completed',$4,$5,NOW(),NOW())
    RETURNING *`,
    [platformUserId, amount, currency, JSON.stringify(meta), idempotencyKey || null]
  );

  return { tx: txR.rows[0], idempotent: false };
}

module.exports = {
  normalizeRole,
  ensureBalanceRow,
  lockFromAvailableToLocked,
  refundLockedToAvailable,
  consumeLockedToPlatform,
};