// src/utils/jwt.js
const jwt = require("jsonwebtoken");

// Access secret: JWT_SECRET yoki ACCESS_TOKEN_SECRET
const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.ACCESS_TOKEN_SECRET ||
  "change-me-access-secret";

// Refresh secret: JWT_REFRESH_SECRET yoki REFRESH_TOKEN_SECRET
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  process.env.REFRESH_TOKEN_SECRET ||
  "change-me-refresh-secret";

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || "24h";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      email: payload.email || null,
      first_name: payload.first_name || null,
      last_name: payload.last_name || null,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      email: payload.email || null,
      first_name: payload.first_name || null,
      last_name: payload.last_name || null,
      type: "refresh",
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  // refresh token ekanini tekshirib qo‘yamiz
  if (decoded?.type !== "refresh") {
    const err = new Error("Not a refresh token");
    err.name = "InvalidToken";
    throw err;
  }
  return decoded;
};

const generateSMSCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSMSCode,
};
