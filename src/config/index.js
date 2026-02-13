// src/config/index.js
require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  baseUrl: process.env.BASE_URL || "http://localhost:3000",

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    accessSecret:
      process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET,
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET,
    expiry: process.env.JWT_EXPIRY || "40m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  platform: {
    userId: process.env.PLATFORM_USER_ID || null,
    feePct: Number(process.env.PLATFORM_FEE_PCT || 10),
  },
};
