// src/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const pool = require("./db/pool");

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
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("joinUser", (userId) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
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

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
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
