// src/middlewares/authMiddleware.js
const { verifyAccessToken } = require('../utils/jwt');
const pool = require('../db/pool');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token topilmadi. Authorization header kerak.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = verifyAccessToken(token);
      
      // Get user from database - sizning tableingizga mos (mavjud maydonlar bilan)
      const result = await pool.query(
        'SELECT id, username, email, phone, role, first_name, last_name, is_verified FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Foydalanuvchi topilmadi.'
        });
      }

      req.user = result.rows[0];
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token muddati tugagan. Yangi token oling.'
        });
      }
      throw error;
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token noto\'g\'ri yoki xato.',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user has specific role
 * @param {string[]} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Avtorizatsiya kerak.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu amalni bajarish uchun ruxsatingiz yo\'q.'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};