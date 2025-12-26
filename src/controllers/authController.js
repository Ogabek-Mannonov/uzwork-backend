// src/controllers/authController.js
const pool = require('../db/pool');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generateSMSCode 
} = require('../utils/jwt');

/**
 * POST /auth/signup
 * User registration
 */
const signup = async (req, res) => {
  try {
    const { email, phone, password, role, first_name, last_name } = req.body;

    // Validation
    if (!email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Barcha maydonlar to\'ldirilishi kerak (email, phone, password, role).'
      });
    }

    if (!['freelancer', 'client'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role "freelancer" yoki "client" bo\'lishi kerak.'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bu email yoki telefon raqam allaqachon ro\'yxatdan o\'tgan.'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate SMS code
    const smsCode = generateSMSCode();
    const smsCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, phone, password_hash, role, first_name, last_name, sms_verification_code, sms_code_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, phone, role, first_name, last_name, created_at`,
      [email, phone, passwordHash, role, first_name || null, last_name || null, smsCode, smsCodeExpires]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // TODO: Send SMS code (integrate with SMS service)

    res.status(201).json({
      success: true,
      message: 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name
        },
        accessToken,
        refreshToken,
        // In development, return SMS code. Remove in production!
        smsCode: process.env.NODE_ENV === 'development' ? smsCode : undefined
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
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
        'SELECT id, email, phone, password_hash, role, first_name, last_name, is_email_verified, is_phone_verified, is_kyc_verified FROM users WHERE email = $1 OR phone = $2',
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

      // Save refresh token
      await pool.query(
        'UPDATE users SET refresh_token = $1 WHERE id = $2',
        [refreshToken, user.id]
      );

      return res.json({
        success: true,
        message: 'Muvaffaqiyatli kirildi!',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            is_email_verified: user.is_email_verified,
            is_phone_verified: user.is_phone_verified,
            is_kyc_verified: user.is_kyc_verified
          },
          accessToken,
          refreshToken
        }
      });
    }

    // Login with SMS code
    if (sms_code) {
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Telefon raqam kiriting.'
        });
      }

      const result = await pool.query(
        'SELECT id, email, phone, role, first_name, last_name, sms_verification_code, sms_code_expires_at, is_email_verified, is_phone_verified, is_kyc_verified FROM users WHERE phone = $1',
        [phone]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Foydalanuvchi topilmadi.'
        });
      }

      const user = result.rows[0];

      // Check SMS code
      if (!user.sms_verification_code || user.sms_verification_code !== sms_code) {
        return res.status(401).json({
          success: false,
          message: 'SMS kod noto\'g\'ri.'
        });
      }

      // Check if code expired
      if (new Date() > new Date(user.sms_code_expires_at)) {
        return res.status(401).json({
          success: false,
          message: 'SMS kod muddati tugagan.'
        });
      }

      // Verify phone and clear SMS code
      await pool.query(
        'UPDATE users SET is_phone_verified = TRUE, sms_verification_code = NULL, sms_code_expires_at = NULL WHERE id = $1',
        [user.id]
      );

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      await pool.query(
        'UPDATE users SET refresh_token = $1 WHERE id = $2',
        [refreshToken, user.id]
      );

      return res.json({
        success: true,
        message: 'SMS kod bilan muvaffaqiyatli kirildi!',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            is_email_verified: user.is_email_verified,
            is_phone_verified: true,
            is_kyc_verified: user.is_kyc_verified
          },
          accessToken,
          refreshToken
        }
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

    // Check if token exists in database
    const result = await pool.query(
      'SELECT id, email, phone, role, refresh_token FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    const user = result.rows[0];

    if (user.refresh_token !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token noto\'g\'ri.'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update refresh token in database
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [newRefreshToken, user.id]
    );

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
    const { sms_code, passport_number, passport_image_url } = req.body;
    const userId = req.user.id;

    // SMS verification
    if (sms_code) {
      const result = await pool.query(
        'SELECT sms_verification_code, sms_code_expires_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Foydalanuvchi topilmadi.'
        });
      }

      const user = result.rows[0];

      if (!user.sms_verification_code || user.sms_verification_code !== sms_code) {
        return res.status(401).json({
          success: false,
          message: 'SMS kod noto\'g\'ri.'
        });
      }

      if (new Date() > new Date(user.sms_code_expires_at)) {
        return res.status(401).json({
          success: false,
          message: 'SMS kod muddati tugagan.'
        });
      }

      await pool.query(
        'UPDATE users SET is_phone_verified = TRUE, sms_verification_code = NULL, sms_code_expires_at = NULL WHERE id = $1',
        [userId]
      );

      return res.json({
        success: true,
        message: 'Telefon raqam tasdiqlandi!'
      });
    }

    // Passport verification
    if (passport_number && passport_image_url) {
      await pool.query(
        'UPDATE users SET passport_number = $1, passport_image_url = $2, kyc_status = $3 WHERE id = $4',
        [passport_number, passport_image_url, 'pending', userId]
      );

      // TODO: Integrate with passport verification service

      return res.json({
        success: true,
        message: 'Passport ma\'lumotlari yuborildi. Tasdiqlash jarayonida.'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'SMS kod yoki passport ma\'lumotlari kerak.'
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
    const { passport_number, passport_image_url } = req.body;
    const userId = req.user.id;

    if (!passport_number || !passport_image_url) {
      return res.status(400).json({
        success: false,
        message: 'Passport raqami va rasm URL kerak.'
      });
    }

    await pool.query(
      'UPDATE users SET passport_number = $1, passport_image_url = $2, kyc_status = $3 WHERE id = $4',
      [passport_number, passport_image_url, 'pending', userId]
    );

    // TODO: Notify admin for KYC review

    res.json({
      success: true,
      message: 'KYC arizasi yuborildi. Tasdiqlash jarayonida.'
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
      `SELECT id, email, phone, role, first_name, last_name, 
              is_email_verified, is_phone_verified, is_kyc_verified, 
              kyc_status, passport_number, created_at, updated_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0]
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
    const userId = req.user.id;

    await pool.query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [userId]
    );

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
