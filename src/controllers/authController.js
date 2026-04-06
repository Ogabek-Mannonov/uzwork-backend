// src/controllers/authController.js
const pool = require("../db/pool");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const sendEmail = require("../utils/sendEmail");

// helper: refresh token exp -> expires_at
const getTokenExpiryDate = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
  if (!payload?.exp) return null;
  return new Date(payload.exp * 1000);
};

/* ===================== PASSWORD RESET HELPERS ===================== */
const sha256 = (s) =>
  crypto.createHash("sha256").update(String(s)).digest("hex");

const genOtp6 = () => String(Math.floor(100000 + Math.random() * 900000));

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const genericForgotResponse = {
  success: true,
  message: "Agar hisob mavjud bo‘lsa, tasdiqlash kodi yuborildi.",
};
/* ================================================================ */

const signup = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      identifier, // combination of email or phone
      password,
      role,
      first_name,
      last_name,
      username,
      display_name,
    } = req.body;

    if (
      !identifier ||
      !password ||
      !role ||
      !first_name ||
      !last_name ||
      !username
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Majburiy: identifier (email yoki telefon), password, role, first_name, last_name, username",
      });
    }

    const isEmail = identifier.includes("@");
    const email = isEmail ? identifier : null;
    const phone = !isEmail ? identifier : null;

    if (!["freelancer", "client"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Role freelancer yoki client bo‘lsin." });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username faqat harf/raqam/_ bo‘lsin.",
      });
    }

    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM users WHERE (email = $1 OR phone = $2) AND deleted_at IS NULL",
      [email || null, phone || null]
    );

    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Bu email yoki telefon raqam allaqachon band.",
      });
    }

    const passwordHash = await hashPassword(password);
    const otp = genOtp6();
    const otpHash = sha256(otp);
    const expiresAt = addMinutes(new Date(), 10);

    const ins = await client.query(
      `INSERT INTO users
        (username, email, phone, password_hash, role, first_name, last_name, display_name, is_verified, avatar_url, reset_code_hash, reset_expires_at, reset_sent_at)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, username, email, phone, role, first_name, last_name, display_name, is_verified, avatar_url, created_at`,
      [
        username,
        email,
        phone,
        passwordHash,
        role,
        first_name,
        last_name,
        display_name || null,
        false,
        null,
        otpHash,
        expiresAt,
        new Date()
      ]
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

    if (email) {
      // Don't wait for email to send before responding to the user, or at least release client first
      const emailPromise = sendEmail({
        to: email,
        subject: "Hisobni tasdiqlash kodi",
        html: `
          <h2>Salom, ${first_name}!</h2>
          <p>Sizning hisobingizni tasdiqlash uchun maxfiy kodingiz:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
          <p>Ushbu kod 10 daqiqa davomida amal qiladi.</p>
          <br />
          <p>Hurmat bilan,<br/><b>UzWork Platformasi</b></p>
        `,
      }).catch(err => console.error("Signup email error:", err));
    }

    // Instead of giving access straight away, require verification
    return res.status(201).json({
      success: true,
      needs_verification: true,
      message: "Tasdiqlash kodi elektron pochtangizga yuborildi.",
      data: {
        userId: user.id
      }
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Unique conflict (email/phone/username).",
      });
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

const verifySignup = async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ success: false, message: "Code va user ID majburiy." });
    }

    const q = await pool.query(
      "SELECT id, reset_code_hash, reset_expires_at FROM users WHERE id = $1 AND deleted_at IS NULL",
      [userId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User topilmadi." });
    }

    const user = q.rows[0];

    if (!user.reset_code_hash || !user.reset_expires_at) {
      return res.status(400).json({ success: false, message: "Tasdiqlash kodi mavjud emas." });
    }

    if (new Date(user.reset_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: "Kod eskirgan." });
    }

    const codeHash = sha256(code);
    if (codeHash !== user.reset_code_hash) {
      return res.status(400).json({ success: false, message: "Kiritilgan kod noto'g'ri." });
    }

    await pool.query(
      `UPDATE users 
       SET is_verified = TRUE, reset_code_hash = NULL, reset_expires_at = NULL 
       WHERE id = $1`,
      [userId]
    );

    return res.json({ success: true, message: "Hisob muvaffaqiyatli tasdiqlandi!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Verify xatolik yuz berdi." });
  }
};

const verify = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(
      `UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
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

/* ===================== NEW: FORGOT / RESET PASSWORD ===================== */

/**
 * POST /auth/forgot-password
 * Body: { email } or { phone }
 * Privacy-friendly response.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body || {};

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email yoki phone yuboring.",
      });
    }

    const userQ = await pool.query(
      `SELECT id, reset_sent_at
       FROM users
       WHERE (email = $1 OR phone = $2) AND deleted_at IS NULL
       LIMIT 1`,
      [email || null, phone || null]
    );

    // privacy: user yo‘q bo‘lsa ham "ok"
    if (userQ.rowCount === 0) {
      return res.json(genericForgotResponse);
    }

    const user = userQ.rows[0];

    // rate limit: 60 sec
    if (user.reset_sent_at) {
      const diffMs = Date.now() - new Date(user.reset_sent_at).getTime();
      if (diffMs < 60 * 1000) {
        return res.status(429).json({
          success: false,
          message: "Kod juda tez so‘raldi. 1 daqiqadan keyin urinib ko‘ring.",
        });
      }
    }

    const otp = genOtp6();
    const otpHash = sha256(otp);
    const now = new Date();
    const expiresAt = addMinutes(now, 10);

    await pool.query(
      `UPDATE users
       SET reset_code_hash = $1,
           reset_expires_at = $2,
           reset_attempts = 0,
           reset_sent_at = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [otpHash, expiresAt, now, user.id]
    );

    console.log("🔐 Password reset OTP:", {
      user_id: user.id,
      to: email || phone,
      otp,
      expiresAt,
    });

    if (email) {
      await sendEmail({
        to: email,
        subject: "Parolni tiklash tasdiqlash kodi",
        html: `
          <h2>Salom, ${user.first_name || "Hurmatli foydalanuvchi"}!</h2>
          <p>Sizning hisobingiz parolini tiklash uchun maxfiy kodingiz:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
          <p>Ushbu kod 10 daqiqa davomida amal qiladi. Iltimos, buni hech kimga bermang.</p>
          <br />
          <p>Hurmat bilan,<br/><b>UzWork Platformasi</b></p>
        `,
      });
    }

    return res.json(genericForgotResponse);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "forgot-password xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /auth/reset-password
 * Body: { identifier, code, new_password }
 * identifier = email yoki phone
 */
const resetPassword = async (req, res) => {
  const client = await pool.connect();

  try {
    const { identifier, code, new_password } = req.body || {};

    if (!identifier || !code || !new_password) {
      return res.status(400).json({
        success: false,
        message: "identifier, code, new_password majburiy.",
      });
    }

    if (String(new_password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Yangi parol kamida 8 ta belgi bo‘lsin.",
      });
    }

    await client.query("BEGIN");

    const userQ = await client.query(
      `SELECT id, reset_code_hash, reset_expires_at, reset_attempts
       FROM users
       WHERE (email = $1 OR phone = $1) AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE`,
      [identifier]
    );

    if (userQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Kod yoki identifier noto‘g‘ri.",
      });
    }

    const user = userQ.rows[0];

    if (!user.reset_code_hash || !user.reset_expires_at) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Reset kodi topilmadi. Avval kod yuboring.",
      });
    }

    if (new Date(user.reset_expires_at) < new Date()) {
      // expired -> clear
      await client.query(
        `UPDATE users
         SET reset_code_hash = NULL,
             reset_expires_at = NULL,
             reset_attempts = 0,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );
      await client.query("COMMIT");
      return res.status(400).json({
        success: false,
        message: "Kod muddati tugagan. Qayta kod yuboring.",
      });
    }

    const attempts = Number(user.reset_attempts || 0);
    if (attempts >= 5) {
      await client.query("ROLLBACK");
      return res.status(429).json({
        success: false,
        message: "Urinishlar limiti tugadi. Keyinroq qayta urinib ko‘ring.",
      });
    }

    const codeHash = sha256(code);
    if (codeHash !== user.reset_code_hash) {
      await client.query(
        `UPDATE users
         SET reset_attempts = reset_attempts + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );
      await client.query("COMMIT");
      return res.status(400).json({
        success: false,
        message: "Kod noto‘g‘ri.",
      });
    }

    const passwordHash = await hashPassword(new_password);

    await client.query(
      `UPDATE users
       SET password_hash = $1,
           reset_code_hash = NULL,
           reset_expires_at = NULL,
           reset_attempts = 0,
           reset_sent_at = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    // security: logout everywhere
    await client.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [user.id]);

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Parol muvaffaqiyatli yangilandi.",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return res.status(500).json({
      success: false,
      message: "reset-password xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

/* ===================== GOOGLE OAUTH ===================== */
const googleLogin = async (req, res) => {
  try {
    const { credential, role } = req.body; 
    
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google token kiritilmadi." });
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${credential}` }
    });

    if (!response.ok) {
      return res.status(401).json({ success: false, message: "Google token yaroqsiz." });
    }

    const payload = await response.json();
    const { email, given_name, family_name, picture, sub } = payload;

    const client = await pool.connect();
    
    try {
      await client.query("BEGIN");

      // Check if user exists by email
      let userQ = await client.query(
        `SELECT id, username, email, phone, role, status, first_name, last_name, display_name, is_verified, avatar_url 
         FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
        [email]
      );

      let user;

      if (userQ.rowCount > 0) {
        user = userQ.rows[0];
        if (user.status === "blocked") {
          await client.query("ROLLBACK");
          client.release();
          return res.status(403).json({ success: false, message: "User bloklangan." });
        }
      } else {
        // Create new user via Google
        const finalRole = role && ["freelancer", "client"].includes(role) ? role : "freelancer";
        const username = "g_" + sub.substring(0, 10); 
        
        const ins = await client.query(
          `INSERT INTO users
            (username, email, role, first_name, last_name, display_name, is_verified, avatar_url)
           VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, username, email, phone, role, first_name, last_name, display_name, is_verified, avatar_url, created_at, status`,
          [
            username,
            email,
            finalRole,
            given_name || "User",
            family_name || "",
            given_name || "Google User",
            true,
            picture || null
          ]
        );

        user = ins.rows[0];

        if (finalRole === "freelancer") {
          await client.query(`INSERT INTO freelancer_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user.id]);
        } else {
          await client.query(`INSERT INTO client_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user.id]);
        }

        await client.query(
          `INSERT INTO user_balances (user_id, available_balance, reserved_balance, escrow_balance, total_earned, total_spent)
           VALUES ($1, 0, 0, 0, 0, 0)
           ON CONFLICT DO NOTHING`,
          [user.id]
        );
      }

      await client.query("COMMIT");

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      const expiresAt = getTokenExpiryDate(refreshToken);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, refreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000)]
      );

      client.release();

      return res.json({
        success: true,
        message: "Google orqali kirdingiz!",
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
    } catch (dbError) {
      try { await client.query("ROLLBACK"); } catch (e) {}
      client.release();
      throw dbError;
    }
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Google login xato.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/* ======================================================================= */

module.exports = {
  signup,
  login,
  refresh,
  verify,
  verifySignup,
  kyc,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  googleLogin,
};
