// src/controllers/authController.js
const pool = require("../db/pool");
const { createNotification } = require("./notificationController");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generate2FAToken,
  verify2FAToken,
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
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const user_agent = req.headers['user-agent'];
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
      q = `SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.role, u.first_name, u.last_name, u.display_name, u.is_verified, 
                   COALESCE(u.avatar_url, fp.avatar_url, cp.avatar_url) as avatar_url, u.status, u.two_factor_enabled,
                   fp.category_id
            FROM users u
            LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
            LEFT JOIN client_profiles cp ON cp.user_id = u.id
            WHERE (u.email=$1 OR u.phone=$2) AND u.deleted_at IS NULL
            LIMIT 1`;
      params = [email, phone];
    } else if (email) {
      q = `SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.role, u.first_name, u.last_name, u.display_name, u.is_verified, 
                   COALESCE(u.avatar_url, fp.avatar_url, cp.avatar_url) as avatar_url, u.status, u.two_factor_enabled,
                   fp.category_id
            FROM users u
            LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
            LEFT JOIN client_profiles cp ON cp.user_id = u.id
            WHERE u.email=$1 AND u.deleted_at IS NULL
            LIMIT 1`;
      params = [email];
    } else {
      q = `SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.role, u.first_name, u.last_name, u.display_name, u.is_verified, 
                   COALESCE(u.avatar_url, fp.avatar_url, cp.avatar_url) as avatar_url, u.status, u.two_factor_enabled,
                   fp.category_id
            FROM users u
            LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
            LEFT JOIN client_profiles cp ON cp.user_id = u.id
            WHERE u.phone=$1 AND u.deleted_at IS NULL
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

    // Check 2FA
    if (user.two_factor_enabled) {
      const twoFactorCode = genOtp6();
      const codeHash = sha256(twoFactorCode);
      const expiresAt2FA = addMinutes(new Date(), 5);

      await pool.query(
        `UPDATE users SET two_factor_code_hash = $1, two_factor_expires_at = $2 WHERE id = $3`,
        [codeHash, expiresAt2FA, user.id]
      );

      // Send 2FA code (Email/SMS)
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "Ikki bosqichli tasdiqlash kodi",
          html: `
            <h2>Salom, ${user.first_name}!</h2>
            <p>Tizimga kirish uchun ikki bosqichli tasdiqlash kodingiz:</p>
            <h1 style="color: #4CAF50; letter-spacing: 5px;">${twoFactorCode}</h1>
            <p>Ushbu kod 5 daqiqa davomida amal qiladi.</p>
            <br />
            <p>Hurmat bilan,<br/><b>UzWork Platformasi</b></p>
          `,
        }).catch(err => console.error("2FA Login Email error:", err));
      }

      // Return 2FA pending state
      const twoFactorToken = generate2FAToken(user);
      return res.json({
        success: true,
        requires_2fa: true,
        message: "Ikki bosqichli tasdiqlash kodi yuborildi.",
        twoFactorToken,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = getTokenExpiryDate(refreshToken);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent, last_active)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.id, refreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000), ip_address, user_agent]
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
          category_id: user.category_id || null,
          two_factor_enabled: user.two_factor_enabled,
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
  const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const user_agent = req.headers['user-agent'];
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
      `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent, last_active)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.id, newRefreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000), ip_address, user_agent]
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

    const updatedUserQ = await pool.query(
      `SELECT u.id, u.username, u.email, u.phone, u.role, u.first_name, u.last_name, u.display_name, u.is_verified, 
              COALESCE(u.avatar_url, fp.avatar_url, cp.avatar_url) as avatar_url
       FROM users u
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    const userRow = updatedUserQ.rows[0];

    const accessToken = generateAccessToken(userRow);
    const refreshToken = generateRefreshToken(userRow);
    const expiresAt = getTokenExpiryDate(refreshToken);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userRow.id, refreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000)]
    );

    return res.json({ 
      success: true, 
      message: "Hisob muvaffaqiyatli tasdiqlandi!",
      data: {
        user: {
          id: userRow.id,
          username: userRow.username,
          email: userRow.email,
          phone: userRow.phone,
          role: userRow.role,
          first_name: userRow.first_name,
          last_name: userRow.last_name,
          display_name: userRow.display_name || userRow.username,
          is_verified: userRow.is_verified,
          avatar_url: userRow.avatar_url,
        },
        accessToken,
        refreshToken
      }
    });
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
    const { email, phone, identifier } = req.body || {};

    let finalEmail = email;
    let finalPhone = phone;

    if (identifier) {
      if (identifier.includes("@")) finalEmail = identifier;
      else finalPhone = identifier;
    }

    if (!finalEmail && !finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Email, phone yoki identifier yuboring.",
      });
    }

    const userQ = await pool.query(
      `SELECT id, email, phone, first_name, reset_sent_at
       FROM users
       WHERE (email = $1 OR phone = $2) AND deleted_at IS NULL
       LIMIT 1`,
      [finalEmail || null, finalPhone || null]
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
          message: "Kod juda tez so‘raldi. 1 daqiqaqadan keyin urinib ko‘ring.",
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
      to: user.email || user.phone,
      otp,
      expiresAt,
    });

    if (user.email) {
      await sendEmail({
        to: user.email,
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

    // ✅ Notify user
    const io = req.app.get("io");
    if (io) {
      createNotification(io, {
        userId: user.id,
        type: 'password_updated',
        relatedId: user.id,
        relatedType: 'user'
      });
    }

    return res.json({
      success: true,
      message: "Parol muvaffaqiyatli o‘zgartirildi.",
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
    console.log("🔑 [Google Login] Boshlandi. Credential uzunligi:", credential ? credential.length : 0);
    
    if (!credential) {
      console.log("⚠️ [Google Login] Credential yo'q!");
      return res.status(400).json({ success: false, message: "Google token kiritilmadi." });
    }

    console.log("🌐 [Google Login] Google API-ga so'rov yuborilmoqda (userinfo)...");
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${credential}` }
    });

    console.log("🌐 [Google Login] Google API-dan javob keldi. Status:", response.status);
    if (!response.ok) {
      console.log("⚠️ [Google Login] Google Token yaroqsiz yoki eskirgan!");
      return res.status(401).json({ success: false, message: "Google token yaroqsiz." });
    }

    const payload = await response.json();
    const { email, given_name, family_name, picture, sub } = payload;
    console.log("📧 [Google Login] Google-dan ma'lumotlar olindi. Email:", email);

    console.log("🔌 [Google Login] Baza ulanishini pool-dan olyapmiz...");
    const client = await pool.connect();
    console.log("🔌 [Google Login] Baza ulanishi muvaffaqiyatli olindi!");
    
    try {
      console.log("📝 [Google Login] Tranzaksiya boshlanmoqda (BEGIN)...");
      await client.query("BEGIN");

      // Check if user exists by email
      console.log("🔍 [Google Login] Foydalanuvchini email orqali qidiryapmiz (SELECT)...");
      let userQ = await client.query(
        `SELECT u.id, u.username, u.email, u.phone, u.role, u.status, u.first_name, u.last_name, u.display_name, u.is_verified, 
                COALESCE(u.avatar_url, fp.avatar_url, cp.avatar_url) as avatar_url,
                fp.category_id
         FROM users u
         LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
         LEFT JOIN client_profiles cp ON cp.user_id = u.id
         WHERE u.email = $1 AND u.deleted_at IS NULL LIMIT 1`,
        [email]
      );
      console.log("🔍 [Google Login] Baza qidiruv yakunlandi. Topilgan qatorlar:", userQ.rowCount);

      let user;

      if (userQ.rowCount > 0) {
        user = userQ.rows[0];
        if (user.status === "blocked") {
          await client.query("ROLLBACK");
          client.release();
          return res.status(403).json({ success: false, message: "User bloklangan." });
        }
      } else {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({
          success: false,
          needs_registration: true,
          message: "Bunday foydalanuvchi mavjud emas. Iltimos, avval ro'yxatdan o'ting.",
        });
      }

      await client.query("COMMIT");

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      const expiresAt = getTokenExpiryDate(refreshToken);
      const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const user_agent = req.headers['user-agent'];

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent, last_active)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [user.id, refreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000), ip_address, user_agent]
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
            category_id: user.category_id || null,
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

/* ===================== 2FA ACTIONS ===================== */

const enable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const userQ = await pool.query("SELECT email, phone, first_name FROM users WHERE id = $1", [userId]);
    const user = userQ.rows[0];

    if (!user.email && !user.phone) {
      return res.status(400).json({
        success: false,
        message: "2FA yoqish uchun email yoki telefon raqam bo'lishi kerak.",
      });
    }

    const code = genOtp6();
    const codeHash = sha256(code);
    const expiresAt = addMinutes(new Date(), 10);

    await pool.query(
      `UPDATE users SET two_factor_code_hash = $1, two_factor_expires_at = $2 WHERE id = $3`,
      [codeHash, expiresAt, userId]
    );

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Ikki bosqichli tasdiqlashni yoqish",
        html: `
          <h2>Salom, ${user.first_name}!</h2>
          <p>Ikki bosqichli tasdiqlashni faollashtirish uchun kodingiz:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px;">${code}</h1>
          <p>Ushbu kod 10 daqiqa davomida amal qiladi.</p>
        `,
      });
    }

    return res.json({
      success: true,
      message: "Tasdiqlash kodi yuborildi.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "2FA enable error." });
  }
};

const confirm2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    const userQ = await pool.query(
      "SELECT two_factor_code_hash, two_factor_expires_at FROM users WHERE id = $1",
      [userId]
    );
    const user = userQ.rows[0];

    if (!user.two_factor_code_hash) {
      return res.status(400).json({ success: false, message: "Tasdiqlash kodi topilmadi. Avval kodni yuboring." });
    }

    if (new Date(user.two_factor_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: "Kodning amal qilish muddati tugagan. Qayta yuboring." });
    }

    const trimmedCode = String(code).trim();
    if (sha256(trimmedCode) !== user.two_factor_code_hash) {
      return res.status(400).json({ success: false, message: "Kiritilgan kod noto'g'ri." });
    }

    await pool.query(
      `UPDATE users SET two_factor_enabled = TRUE, two_factor_code_hash = NULL, two_factor_expires_at = NULL WHERE id = $1`,
      [userId]
    );

    return res.json({
      success: true,
      message: "Ikki bosqichli tasdiqlash muvaffaqiyatli yoqildi!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "2FA confirm error." });
  }
};

const disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(`UPDATE users SET two_factor_enabled = FALSE WHERE id = $1`, [userId]);
    return res.json({ success: true, message: "Ikki bosqichli tasdiqlash o'chirildi." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "2FA disable error." });
  }
};

const verify2FALogin = async (req, res) => {
  try {
    const { twoFactorToken, code } = req.body;
    if (!twoFactorToken || !code) {
      return res.status(400).json({ success: false, message: "Token va kod majburiy." });
    }

    const decoded = verify2FAToken(twoFactorToken);
    const userId = decoded.id;

    const userQ = await pool.query(
      `SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.role, u.first_name, u.last_name, u.display_name, u.is_verified, u.avatar_url, u.status, u.two_factor_code_hash, u.two_factor_expires_at,
              fp.category_id
       FROM users u
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId]
    );

    if (userQ.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User topilmadi." });
    }

    const user = userQ.rows[0];

    if (!user.two_factor_code_hash || new Date(user.two_factor_expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: "Kod eskirgan." });
    }

    if (sha256(code) !== user.two_factor_code_hash) {
      return res.status(400).json({ success: false, message: "Noto'g'ri kod." });
    }

    // Success - clear 2FA session fields
    await pool.query(
      `UPDATE users SET two_factor_code_hash = NULL, two_factor_expires_at = NULL WHERE id = $1`,
      [userId]
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = getTokenExpiryDate(refreshToken);
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const user_agent = req.headers['user-agent'];

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent, last_active)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.id, refreshToken, expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000), ip_address, user_agent]
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
          category_id: user.category_id || null,
          two_factor_enabled: true
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "2FA verify login error." });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ success: false, message: "Barcha maydonlarni to'ldiring." });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ success: false, message: "Yangi parollar mos emas." });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: "Yangi parol kamida 8 ta belgi bo'lishi kerak." });
    }

    const userQ = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    const user = userQ.rows[0];

    const isMatch = await comparePassword(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Joriy parol noto'g'ri." });
    }

    const salt = await hashPassword(new_password);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [salt, userId]);

    // Optional: Notify user
    const io = req.app.get("io");
    if (io) {
      createNotification(io, {
        userId,
        type: 'password_updated',
        relatedId: userId,
        relatedType: 'user'
      });
    }

    return res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi." });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ success: false, message: "Parolni o'zgartirishda xatolik yuz berdi." });
  }
};

const getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const user_agent = req.headers['user-agent'];
    const refreshToken = req.cookies?.refreshToken;

    // Auto-update current session if metadata is missing
    if (refreshToken) {
      await pool.query(
        'UPDATE refresh_tokens SET ip_address = COALESCE(ip_address, $1), user_agent = COALESCE(user_agent, $2), last_active = NOW() WHERE token = $3 AND user_id = $4',
        [ip_address, user_agent, refreshToken, userId]
      );
    }

    const q = await pool.query(
      `SELECT id, COALESCE(ip_address, 'Noma''lum IP') as ip_address, 
              COALESCE(user_agent, 'Eski seans/Noma''lum qurilma') as user_agent, 
              last_active, expires_at, token
       FROM refresh_tokens 
       WHERE user_id = $1 
       ORDER BY last_active DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: q.rows
    });
  } catch (error) {
    console.error("Get Sessions Error:", error);
    return res.status(500).json({ success: false, message: "Sessiyalarni yuklashda xatolik" });
  }
};

const revokeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const q = await pool.query(
      "DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2 RETURNING id",
      [sessionId, userId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ success: true, message: "Sessiya topilmadi" });
    }

    return res.json({
      success: true,
      message: "Sessiya yopildi"
    });
  } catch (error) {
    console.error("Revoke Session Error:", error);
    return res.status(500).json({ success: false, message: "Sessiyani yopishda xatolik" });
  }
};

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
  enable2FA,
  confirm2FA,
  disable2FA,
  verify2FALogin,
  changePassword,
  getSessions,
  revokeSession,
};
