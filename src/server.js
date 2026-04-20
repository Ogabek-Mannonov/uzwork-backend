// src/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();
const { startCron } = require("./cron");
startCron();
const { verifyAccessToken } = require("./utils/jwt");

const pool = require("./db/pool");

// Socket state - controllerlar ishlatishi uchun
let activeSocketsMap = new Map();
let lastSeenMapStore = new Map();
const getActiveSockets = () => activeSocketsMap;
const getLastSeenMap = () => lastSeenMapStore;
module.exports = { getActiveSockets, getLastSeenMap };

// Routes
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const contractRoutes = require("./routes/contractRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const profileRoutes = require("./routes/profileRoutes");
const freelancerRoutes = require("./routes/freelancerRoutes");
const clientRoutes = require("./routes/clientRoutes");
const searchRoutes = require("./routes/searchRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
const supportRoutes = require("./routes/supportRoutes");
const currencyRoutes = require("./routes/currencyRoutes");
const fileRoutes = require("./routes/fileRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const disputeRoutes = require("./routes/disputeRoutes");
const milestoneRoutes = require("./routes/milestoneRoutes");
const landingRoutes = require("./routes/landingRoutes");
// freelancerCertificationsRoutes endi freelancerRoutes.js ichida birlashtirildi



const localeMiddleware = require("./middlewares/localeMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Render/Proxy bo‘lsa kerak (cookie/ip uchun foydali)
app.set("trust proxy", 1);

// HTTP server (socket uchun)
const server = http.createServer(app);

// CORS origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://uzwork.uz",
  "https://uzwork-admin-panel.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// io ni controllers ichidan ishlatish uchun
app.set("io", io);

// Socket events
activeSocketsMap = new Map();
lastSeenMapStore = new Map();

io.on("connection", (socket) => {
  let currentUserId = null;

  const parseSocketUserId = () => {
    try {
      const authToken = socket.handshake?.auth?.token;
      const headerToken = socket.handshake?.headers?.authorization;
      const raw = authToken || headerToken || "";
      const token = String(raw).startsWith("Bearer ")
        ? String(raw).slice(7).trim()
        : String(raw).trim();
      if (!token) return null;
      const decoded = verifyAccessToken(token);
      return decoded?.id ? String(decoded.id) : null;
    } catch {
      return null;
    }
  };

  const leaveCurrentJoin = async () => {
    if (!currentUserId) return;
    const userSockets = activeSocketsMap.get(currentUserId);
    if (!userSockets) return;

    userSockets.delete(socket.id);

    if (userSockets.size > 0) {
      console.log(`[presence] ${currentUserId} socket left (${socket.id}), remaining=${userSockets.size}`);
      return;
    }

    const lastSeen = new Date().toISOString();
    lastSeenMapStore.set(currentUserId, lastSeen);
    activeSocketsMap.delete(currentUserId);

    try {
      await pool.query(
        `UPDATE users SET is_online = false, last_seen = $1 WHERE id = $2`,
        [lastSeen, currentUserId]
      );
    } catch (err) {
      console.error("Error updating offline status:", err.message);
    }

    console.log(`[presence] OFFLINE user=${currentUserId} lastSeen=${lastSeen}`);
    io.emit("userStatus", { userId: currentUserId, isOnline: false, lastSeen });
  };

  const markUserOnline = async (userId, source = "unknown") => {
    if (!userId) return;
    const uid = String(userId);

    if (currentUserId && currentUserId !== uid) {
      await leaveCurrentJoin();
    }
    currentUserId = uid;

    if (!activeSocketsMap.has(uid)) {
      activeSocketsMap.set(uid, new Set());
    }
    const userSockets = activeSocketsMap.get(uid);
    userSockets.add(socket.id);

    try {
      await pool.query(
        `UPDATE users SET is_online = true, last_seen = NULL WHERE id = $1`,
        [uid]
      );
    } catch (err) {
      console.error("Error updating online status:", err.message);
    }

    socket.join(`user_${uid}`);
    console.log(`[presence] ONLINE user=${uid} sockets=${userSockets.size} source=${source}`);
    io.emit("userStatus", { userId: uid, isOnline: true, lastSeen: null });
  };

  const handshakeUserId = parseSocketUserId();
  if (handshakeUserId) {
    markUserOnline(handshakeUserId, "handshake-token").catch((err) => {
      console.error("Presence handshake markUserOnline error:", err.message);
    });
  }

  socket.on("joinUser", async (userId) => {
    if (!userId) return;
    const claimedUserId = String(userId);
    if (handshakeUserId && handshakeUserId !== claimedUserId) {
      console.warn(`[presence] joinUser mismatch socket=${socket.id} token=${handshakeUserId} claimed=${claimedUserId}`);
      await markUserOnline(handshakeUserId, "joinUser-mismatch-token-priority");
      return;
    }
    await markUserOnline(claimedUserId, "joinUser");
  });

  socket.on("checkStatus", async (userId) => {
    if (!userId) return;
    const uid = String(userId);
    const isOnline = activeSocketsMap.get(uid)?.size > 0;

    if (isOnline) {
      console.log(`[presence] checkStatus user=${uid} => ONLINE`);
      socket.emit("userStatus", { userId: uid, isOnline: true, lastSeen: null });
      return;
    }

    let dbLastSeen = null;
    try {
      const res = await pool.query(`SELECT last_seen FROM users WHERE id = $1`, [uid]);
      dbLastSeen = res.rows[0]?.last_seen;
    } catch (err) {
      console.error("Error getting last_seen:", err.message);
    }

    const lastSeen = dbLastSeen || lastSeenMapStore.get(uid) || null;
    console.log(`[presence] checkStatus user=${uid} => OFFLINE lastSeen=${lastSeen || "null"}`);
    socket.emit("userStatus", {
      userId: uid,
      isOnline: false,
      lastSeen,
    });
  });

  socket.on("disconnect", async (reason) => {
    await leaveCurrentJoin();
    currentUserId = null;
    console.log(`[presence] socket disconnected id=${socket.id} reason=${reason || "unknown"}`);
  });

  socket.on("joinChat", (chatId) => {
    if (!chatId) return;
    socket.join(chatId);
  });

  socket.on("sendMessage", (data) => {
    const { chatId, receiverId, message } = data || {};
    if (!chatId || !message) return;

    io.to(chatId).emit("newMessage", message);

    if (receiverId) {
      io.to(`user_${receiverId}`).emit("unreadUpdate", {
        chatId,
        unreadCount: 1,
      });
    }
  });

  socket.on("markAsRead", ({ chatId, userId }) => {
    if (!chatId || !userId) return;
    io.to(`user_${userId}`).emit("messagesRead", { chatId });
  });

  socket.on("typing", ({ chatId, userId, username }) => {
    if (!chatId) return;
    socket.to(chatId).emit("userTyping", { userId, username });
  });

  socket.on("stopTyping", ({ chatId }) => {
    if (!chatId) return;
    socket.to(chatId).emit("userStoppedTyping");
  });

  
  socket.on("removeReaction", async ({ chatId, messageId, emoji, userId }) => {
    if (!chatId || !messageId || !emoji) return;
    try {
      const updateQuery = `
        UPDATE messages
        SET reactions = (
          SELECT COALESCE(
            jsonb_agg(
              CASE 
                WHEN elem->>'emoji' = $1 THEN 
                  CASE 
                    WHEN (elem->>'count')::int > 1 THEN jsonb_set(elem, '{count}', ( (elem->>'count')::int - 1 )::text::jsonb)
                    ELSE NULL
                  END
                ELSE elem
              END
            ) FILTER (WHERE CASE WHEN elem->>'emoji' = $1 THEN (elem->>'count')::int > 1 ELSE true END),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(reactions) AS elem
        )
        WHERE id = $2
        RETURNING reactions;
      `;
      const res = await pool.query(updateQuery, [emoji, messageId]);
      if (res.rows.length > 0) {
        // Option 1: rely on optimistic frontend
        // io.to(chatId).emit("reactionRemoved", { messageId, emoji, reactions: res.rows[0].reactions });
      }
    } catch (err) {
      console.error("❌ socket removeReaction error:", err.message);
    }
  });

  socket.on("addReaction", async ({ chatId, messageId, emoji }) => {
    if (!chatId || !messageId || !emoji) return;

    try {
      // ✅ Atomically update reactions in JSONB array
      // Agar ushbu emoji bo'lsa count+1 qiladi, bo'lmasa yangi element qo'shadi
      const updateQuery = `
        UPDATE messages
        SET reactions = (
          CASE 
            WHEN reactions @> jsonb_build_array(jsonb_build_object('emoji', $1::text))
            THEN (
              SELECT jsonb_agg(
                CASE 
                  WHEN elem->>'emoji' = $1 THEN jsonb_set(elem, '{count}', ( (elem->>'count')::int + 1 )::text::jsonb)
                  ELSE elem
                END
              )
              FROM jsonb_array_elements(reactions) AS elem
            )
            ELSE reactions || jsonb_build_array(jsonb_build_object('emoji', $1, 'count', 1))
          END
        )
        WHERE id = $2
        RETURNING reactions;
      `;
      
      const res = await pool.query(updateQuery, [emoji, messageId]);
      
      if (res.rows.length > 0) {
        // Chatdagi hammaga xabar berish
        io.to(chatId).emit("reactionAdded", { 
          messageId, 
          emoji, 
          reactions: res.rows[0].reactions 
        });
      }
    } catch (err) {
      console.error("❌ socket addReaction error:", err.message);
    }
  });
});

// Middlewares
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

app.use(localeMiddleware);

// Static uploads (1 marta, konflikt yo‘q)
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "../uploads"))
);




// Test route
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      message: "UzWork backend ishlayapti! 🇺🇿🚀",
      version: "1.0.0",
      database_time: result.rows[0].now,
      features: {
        socketIO: true,
        uploads: true,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Database ulanishda xato",
      error: err.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/proposals", proposalRoutes);
app.use("/contracts", contractRoutes);
app.use("/reviews", reviewRoutes);
app.use("/profiles", profileRoutes);
app.use("/freelancers", freelancerRoutes);
app.use("/clients", clientRoutes);
app.use("/search", searchRoutes);
app.use("/notifications", notificationRoutes);
app.use("/messages", messageRoutes);
app.use("/payments", paymentRoutes);
app.use("/marketplace", marketplaceRoutes);
app.use("/admin", adminRoutes);
app.use("/ai", aiRoutes);
app.use("/support", supportRoutes);
app.use("/currencies", currencyRoutes);
app.use("/files", fileRoutes);
app.use("/upload", uploadRoutes);
app.use("/disputes", disputeRoutes);
app.use("/milestones", milestoneRoutes);
app.use("/api/landing", landingRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route topilmadi: ${req.method} ${req.url}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Fayl hajmi juda katta",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server xatosi",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("⚠️ SIGTERM: closing server...");
  server.close(() => {
    pool.end(() => {
      console.log("✅ DB pool closed");
      process.exit(0);
    });
  });
});

// Start
server.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🚀 UzWork Server ishga tushdi!");
  console.log("📡 Port:", PORT);
  console.log("💬 Socket.io: Enabled");
  console.log("📁 Uploads:", "/uploads");
  console.log("🔒 Env:", process.env.NODE_ENV || "development");
  console.log("=".repeat(50));
});

