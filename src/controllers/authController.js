// src/controllers/authController.js
const pool = require('../db/pool');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken
} = require('../utils/jwt');

/**
 * POST /auth/signup
 * User registration
 */
const signup = async (req, res) => {
  try {
    const { email, phone, password, role, first_name, last_name, username, display_name } = req.body;

    // Validation
    if (!email || !phone || !password || !role || !first_name || !last_name || !username) {
      return res.status(400).json({
        success: false,
        message: 'Barcha maydonlar to\'ldirilishi kerak (email, phone, password, role, first_name, last_name, username).'
      });
    }

    if (!['freelancer', 'client'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role "freelancer" yoki "client" bo\'lishi kerak.'
      });
    }

    // Validate username format (alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username faqat harflar, raqamlar va _ belgisidan iborat bo\'lishi kerak.'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2 OR username = $3',
      [email, phone, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bu email, telefon raqam yoki username allaqachon ro\'yxatdan o\'tgan.'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, phone, password_hash, role, first_name, last_name, display_name, is_verified, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, username, email, phone, role, first_name, last_name, display_name, is_verified, avatar_url, created_at`,
      [username, email, phone, passwordHash, role, first_name, last_name, display_name || null, false, null]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz!',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name || user.username,  // <--- qo‘shildi
          is_verified: user.is_verified,                    // <--- qo‘shildi
          avatar_url: user.avatar_url                        // <--- qo‘shildi
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Bu email, telefon raqam yoki username allaqachon ro\'yxatdan o\'tgan.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ro\'yxatdan o\'tishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /auth/login
 * User login (email/phone + password or SMS code)
 */
const login = async (req, res) => {
  try {
    const { email, phone, password, sms_code } = req.body;

    // Login with password
    if (password) {
      if (!email && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Email yoki telefon raqam kiriting.'
        });
      }

      // Find user
      const result = await pool.query(
        'SELECT id, username, email, phone, password_hash, role, first_name, last_name, display_name, is_verified, avatar_url FROM users WHERE email = $1 OR phone = $2',
        [email || phone, email || phone]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Email/telefon yoki parol noto\'g\'ri.'
        });
      }

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email/telefon yoki parol noto\'g\'ri.'
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      return res.json({
        success: true,
        message: 'Muvaffaqiyatli kirildi!',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            display_name: user.display_name || user.username,  // <--- qo‘shildi
            is_verified: user.is_verified,                    // <--- qo‘shildi
            avatar_url: user.avatar_url                        // <--- qo‘shildi
          },
          accessToken,
          refreshToken
        }
      });
    }

    // Login with SMS code (not implemented in new schema - requires separate SMS verification table)
    if (sms_code) {
      return res.status(400).json({
        success: false,
        message: 'SMS kod bilan kirish hozircha qo\'llab-quvvatlanmaydi. Parol bilan kirishdan foydalaning.'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Parol yoki SMS kod kiriting.'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Kirishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token kerak.'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token noto\'g\'ri yoki muddati tugagan.'
      });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id, username, email, phone, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    const user = result.rows[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      message: 'Token yangilandi!',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /auth/verify
 * Verify SMS code or passport
 */
const verify = async (req, res) => {
  try {
    const userId = req.user.id;

    // Mark user as verified (simple verification - can be extended later)
    await pool.query(
      'UPDATE users SET is_verified = TRUE WHERE id = $1',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Foydalanuvchi tasdiqlandi!'
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Tasdiqlashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /auth/kyc
 * KYC verification (admin will approve/reject)
 */
const kyc = async (req, res) => {
  try {
    // KYC functionality not implemented in new schema
    // Can be added later with separate KYC table
    return res.status(501).json({
      success: false,
      message: 'KYC funksiyasi hozircha qo\'llab-quvvatlanmaydi. Keyingi versiyada qo\'shiladi.'
    });
  } catch (error) {
    console.error('KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'KYC arizasida xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /auth/me
 * Get current user information
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, username, email, phone, role, first_name, last_name, display_name,
              is_verified, is_premium, premium_until, balance_uzs, balance_usd,
              avatar_url, created_at, updated_at 
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    const user = result.rows[0];

    res.json({
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
          display_name: user.display_name || user.username,  // <--- qo‘shildi
          is_verified: user.is_verified,                    // <--- qo‘shildi
          is_premium: user.is_premium,
          premium_until: user.premium_until,
          balance_uzs: user.balance_uzs,
          balance_usd: user.balance_usd,
          avatar_url: user.avatar_url,                      // <--- qo‘shildi
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /auth/logout
 * Logout user (invalidate refresh token)
 */
const logout = async (req, res) => {
  try {
    // In new schema, refresh tokens are not stored in database
    // Client should delete tokens on their side
    res.json({
      success: true,
      message: 'Muvaffaqiyatli chiqildi!'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Chiqishda xato yuz berdi.',
      error: error.message
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
  logout
};