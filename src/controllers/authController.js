// src/controllers/authController.js
const pool = require("../db/pool");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

// helper: refresh token exp -> expires_at
const getTokenExpiryDate = (token) => {
  // JWT decode without verify (we already verify elsewhere sometimes)
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000);
};

const signup = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, phone, password, role, first_name, last_name, username, display_name } = req.body;

    if (!email || !phone || !password || !role || !first_name || !last_name || !username) {
      return res.status(400).json({
        success: false,
        message: "Majburiy: email, phone, password, role, first_name, last_name, username",
      });
    }

    if (!["freelancer", "client"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role freelancer yoki client bo‘lsin." });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username faqat harf/raqam/_ bo‘lsin.",
      });
    }

    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1 OR phone = $2 OR username = $3",
      [email, phone, username]
    );

    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Email/phone/username allaqachon bor.",
      });
    }

    const passwordHash = await hashPassword(password);

    const ins = await client.query(
      `INSERT INTO users
        (username, email, phone, password_hash, role, first_name, last_name, display_name, is_verified, avatar_url)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, username, email, phone, role, first_name, last_name, display_name, is_verified, avatar_url, created_at`,
      [username, email, phone, passwordHash, role, first_name, last_name, display_name || null, false, null]
    );

    const user = ins.rows[0];

    // profiles
    if (role === "freelancer") {
      await client.query(
        `INSERT INTO freelancer_profiles (user_id)
         VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    } else {
      await client.query(
        `INSERT INTO client_profiles (user_id)
         VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    }

    // balances
    await client.query(
      `INSERT INTO user_balances (user_id, available_balance, reserved_balance, escrow_balance, total_earned, total_spent)
       VALUES ($1, 0, 0, 0, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    await client.query("COMMIT");

    // tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = getTokenExpiryDate(refreshToken);

    // store refresh
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000)]
    );

    return res.status(201).json({
      success: true,
      message: "Ro‘yxatdan o‘tdingiz!",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name || user.username,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (e) {}
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Unique conflict (email/phone/username)." });
    }
    return res.status(500).json({
      success: false,
      message: "Signup xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Parol kiriting." });
    }
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: "Email yoki phone kiriting." });
    }

    let q, params;
    if (email && phone) {
      q = `SELECT id, username, email, phone, password_hash, role, first_name, last_name, display_name, is_verified, avatar_url, status
           FROM users
           WHERE (email=$1 OR phone=$2) AND deleted_at IS NULL
           LIMIT 1`;
      params = [email, phone];
    } else if (email) {
      q = `SELECT id, username, email, phone, password_hash, role, first_name, last_name, display_name, is_verified, avatar_url, status
           FROM users
           WHERE email=$1 AND deleted_at IS NULL
           LIMIT 1`;
      params = [email];
    } else {
      q = `SELECT id, username, email, phone, password_hash, role, first_name, last_name, display_name, is_verified, avatar_url, status
           FROM users
           WHERE phone=$1 AND deleted_at IS NULL
           LIMIT 1`;
      params = [phone];
    }

    const result = await pool.query(q, params);
    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: "Login yoki parol noto‘g‘ri." });
    }

    const user = result.rows[0];

    if (user.status === "blocked") {
      return res.status(403).json({ success: false, message: "User bloklangan." });
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Login yoki parol noto‘g‘ri." });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = getTokenExpiryDate(refreshToken);

    // rotate: eski tokenlarni tozalab tashlash shart emas, lekin tartibli bo‘lsin:
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000)]
    );

    return res.json({
      success: true,
      message: "Kirdingiz!",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name || user.username,
          is_verified: user.is_verified,
          avatar_url: user.avatar_url,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "refreshToken kerak." });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (e) {
      return res.status(401).json({ success: false, message: "Refresh token noto‘g‘ri yoki expired." });
    }

    // token DBda bormi + expired emasmi
    const tokenQ = await pool.query(
      `SELECT id, user_id, expires_at
       FROM refresh_tokens
       WHERE token = $1
       LIMIT 1`,
      [refreshToken]
    );

    if (tokenQ.rowCount === 0) {
      return res.status(401).json({ success: false, message: "Refresh token DBda topilmadi." });
    }

    const tokenRow = tokenQ.rows[0];
    if (tokenRow.user_id !== decoded.id) {
      return res.status(401).json({ success: false, message: "Refresh token user bilan mos emas." });
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return res.status(401).json({ success: false, message: "Refresh token expired (DB)." });
    }

    const userQ = await pool.query(
      `SELECT id, username, email, phone, role, status
       FROM users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [decoded.id]
    );

    if (userQ.rowCount === 0) {
      return res.status(401).json({ success: false, message: "User topilmadi." });
    }

    if (userQ.rows[0].status === "blocked") {
      return res.status(403).json({ success: false, message: "User bloklangan." });
    }

    const user = userQ.rows[0];

    // rotate token: eski refreshni delete + yangisini insert
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const expiresAt = getTokenExpiryDate(newRefreshToken);

    await pool.query("BEGIN");
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, newRefreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000)]
    );
    await pool.query("COMMIT");

    return res.json({
      success: true,
      message: "Token yangilandi!",
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {});
    return res.status(500).json({
      success: false,
      message: "Refresh xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const verify = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(`UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
    return res.json({ success: true, message: "User verified!" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Verify xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const kyc = async (req, res) => {
  return res.status(501).json({
    success: false,
    message: "KYC hozircha yo‘q (keyin qo‘shamiz).",
  });
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const q = await pool.query(
      `SELECT
        u.id, u.username, u.email, u.phone, u.role,
        u.first_name, u.last_name, u.display_name,
        u.is_verified, u.is_premium, u.premium_until,
        u.avatar_url, u.status, u.created_at, u.updated_at,

        ub.available_balance,
        ub.reserved_balance,
        ub.escrow_balance,
        ub.total_earned,
        ub.total_spent,
        ub.updated_at AS balance_updated_at

       FROM users u
       LEFT JOIN user_balances ub ON ub.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User topilmadi." });
    }

    const user = q.rows[0];

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name || user.username,
          is_verified: user.is_verified,
          is_premium: user.is_premium,
          premium_until: user.premium_until,
          avatar_url: user.avatar_url,
          status: user.status,
          created_at: user.created_at,
          updated_at: user.updated_at,
          balances: {
            available_balance: user.available_balance ?? 0,
            reserved_balance: user.reserved_balance ?? 0,
            escrow_balance: user.escrow_balance ?? 0,
            total_earned: user.total_earned ?? 0,
            total_spent: user.total_spent ?? 0,
            updated_at: user.balance_updated_at ?? null,
          },
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "getMe xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const logout = async (req, res) => {
  try {
    // variant 1: userning hamma refresh tokenlarini o‘chirib yuboramiz (oddiy va ishonchli)
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [req.user.id]);

    return res.json({ success: true, message: "Chiqildi (logout)!" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  signup,
  login,
  refresh,
  verify,
  kyc,
  getMe,
  logout,
};
