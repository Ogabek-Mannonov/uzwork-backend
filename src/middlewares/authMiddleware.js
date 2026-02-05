// src/middlewares/authMiddleware.js
const { verifyAccessToken } = require("../utils/jwt");
const pool = require("../db/pool");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token topilmadi. Authorization: Bearer <token> kerak.",
      });
    }

    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token bo‘sh.",
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token muddati tugagan. Refresh bilan yangilang.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Token noto‘g‘ri.",
      });
    }

    const result = await pool.query(
      `SELECT id, username, email, phone, role, first_name, last_name, is_verified, status
       FROM users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "Foydalanuvchi topilmadi.",
      });
    }

    const user = result.rows[0];

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Akkount bloklangan.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Auth xato.",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Avtorizatsiya kerak.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bu amal uchun ruxsat yo‘q.",
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
