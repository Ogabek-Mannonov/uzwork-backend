// src/controllers/adminController.js
const pool = require('../db/pool');

/**
 * Admin middleware – foydalanuvchi admin ekanligini tekshiradi
 */
const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Faqat admin foydalanuvchilar kirishi mumkin.'
      });
    }

    next();
  } catch (error) {
    console.error('isAdmin error:', error);
    res.status(500).json({
      success: false,
      message: 'Xato yuz berdi.'
    });
  }
};

const getRangeStart = (range) => {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "7d") {
    start.setDate(start.getDate() - 7);
    return start;
  }

  // default 30d
  start.setDate(start.getDate() - 30);
  return start;
};

const getPrevRangeStart = (range) => {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    // yesterday 00:00
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "7d") {
    start.setDate(start.getDate() - 14);
    return start;
  }

  // 30d -> 60d
  start.setDate(start.getDate() - 60);
  return start;
};

const toIso = (d) => d.toISOString();

const pct = (current, prev) => {
  const c = Number(current) || 0;
  const p = Number(prev) || 0;
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
};

const formatMoneyUZS = (n) => {
  const num = Number(n) || 0;
  return `${num.toLocaleString()} so'm`;
};

const timeAgoUz = (date) => {
  try {
    const now = new Date();
    const t = new Date(date);
    const diffMs = now - t;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "hozirgina";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} daqiqa oldin`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} soat oldin`;
    const day = Math.floor(hr / 24);
    return `${day} kun oldin`;
  } catch {
    return "—";
  }
};

/**
 * GET /admin/dashboard
 * Dashboard uchun real statistika
 */
// src/controllers/adminController.js
const getDashboardStats = async (req, res) => {
  const range = String(req.query.range || "30d");
  const rangeStart = getRangeStart(range);
  const prevStart = getPrevRangeStart(range);

  const stats = {};
  const breakdown = {};
  const finance = {};
  const moderation = {};
  const chatStats = {};

  let topClients = [];
  let topFreelancers = [];
  let recentActivity = [];

  try {
    // ===== TOTAL COUNTS =====
    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM users");
      stats.totalUsers = r.rows[0]?.c ?? 0;
    } catch (e) { stats.totalUsers = 0; }

    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE role='freelancer'");
      stats.totalFreelancers = r.rows[0]?.c ?? 0;
    } catch (e) { stats.totalFreelancers = 0; }

    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE role='client'");
      stats.totalClients = r.rows[0]?.c ?? 0;
    } catch (e) { stats.totalClients = 0; }

    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE status='blocked'");
      moderation.blockedUsers = r.rows[0]?.c ?? 0;
    } catch (e) { moderation.blockedUsers = 0; }

    // ===== JOBS TOTAL + ACTIVE (FIXED) =====
    // MUAMMO SHU YERDA EDI: deleted_at IS NULL qo‘shildi
    try {
      const r = await pool.query(`
        SELECT COUNT(*)::int AS c
        FROM jobs
        WHERE deleted_at IS NULL
          AND status IN ('open','in_progress')
      `);
      stats.activeJobs = r.rows[0]?.c ?? 0;
    } catch (e) { stats.activeJobs = 0; }

    // ===== RANGE: new users/jobs, revenue =====
    let newUsers = 0, prevNewUsers = 0;
    let newJobs = 0, prevNewJobs = 0;
    let revenue = 0, prevRevenue = 0;
    let fee = 0, prevFee = 0;

    try {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1",
        [toIso(rangeStart)]
      );
      newUsers = r.rows[0]?.c ?? 0;

      const pr = await pool.query(
        "SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1 AND created_at < $2",
        [toIso(prevStart), toIso(rangeStart)]
      );
      prevNewUsers = pr.rows[0]?.c ?? 0;
    } catch (e) {}

    try {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS c FROM jobs WHERE created_at >= $1 AND deleted_at IS NULL",
        [toIso(rangeStart)]
      );
      newJobs = r.rows[0]?.c ?? 0;

      const pr = await pool.query(
        "SELECT COUNT(*)::int AS c FROM jobs WHERE created_at >= $1 AND created_at < $2 AND deleted_at IS NULL",
        [toIso(prevStart), toIso(rangeStart)]
      );
      prevNewJobs = pr.rows[0]?.c ?? 0;
    } catch (e) {}

    // Revenue from transactions
    try {
      const r = await pool.query(
        `SELECT COALESCE(SUM(amount),0)::bigint AS s
         FROM transactions
         WHERE status='completed' AND created_at >= $1`,
        [toIso(rangeStart)]
      );
      revenue = Number(r.rows[0]?.s ?? 0);

      const pr = await pool.query(
        `SELECT COALESCE(SUM(amount),0)::bigint AS s
         FROM transactions
         WHERE status='completed' AND created_at >= $1 AND created_at < $2`,
        [toIso(prevStart), toIso(rangeStart)]
      );
      prevRevenue = Number(pr.rows[0]?.s ?? 0);
    } catch (e) {}

    // Platform fee
    try {
      const r = await pool.query(
        `SELECT COALESCE(SUM(amount),0)::bigint AS s
         FROM transactions
         WHERE type='platform_fee' AND status='completed' AND created_at >= $1`,
        [toIso(rangeStart)]
      );
      fee = Number(r.rows[0]?.s ?? 0);

      const pr = await pool.query(
        `SELECT COALESCE(SUM(amount),0)::bigint AS s
         FROM transactions
         WHERE type='platform_fee' AND status='completed'
           AND created_at >= $1 AND created_at < $2`,
        [toIso(prevStart), toIso(rangeStart)]
      );
      prevFee = Number(pr.rows[0]?.s ?? 0);
    } catch (e) {}

    stats.newUsers = newUsers;
    stats.newJobs = newJobs;

    stats.usersGrowthPct = pct(newUsers, prevNewUsers);
    stats.jobsGrowthPct = pct(newJobs, prevNewJobs);
    stats.revenueGrowthPct = pct(revenue, prevRevenue);
    stats.feeGrowthPct = pct(fee, prevFee);

    stats.totalRevenue = revenue;
    stats.platformFee = fee;

    stats.totalRevenueLabel = formatMoneyUZS(revenue);
    stats.platformFeeLabel = formatMoneyUZS(fee);

    // ===== JOB STATUS BREAKDOWN =====
    try {
      const r = await pool.query(`
        SELECT status, COUNT(*)::int AS c
        FROM jobs
        WHERE deleted_at IS NULL
        GROUP BY status
      `);
      const map = {};
      r.rows.forEach(x => { map[x.status] = x.c; });

      breakdown.jobs = {
        open: map.open || 0,
        in_progress: map.in_progress || 0,
        completed: map.completed || 0,
        cancelled: map.cancelled || 0,
      };
    } catch (e) {
      breakdown.jobs = { open: 0, in_progress: 0, completed: 0, cancelled: 0 };
    }

    // ===== QUICK STATS (milestones/disputes) =====
    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM disputes WHERE status='open'");
      moderation.openDisputes = r.rows[0]?.c ?? 0;
    } catch (e) { moderation.openDisputes = 0; }

    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM milestones WHERE status='pending'");
      moderation.pendingMilestones = r.rows[0]?.c ?? 0;
    } catch (e) { moderation.pendingMilestones = 0; }

    try {
      const r = await pool.query(`
        SELECT COUNT(*)::int AS c
        FROM milestones
        WHERE status='approved'
          AND approved_at >= date_trunc('month', CURRENT_DATE)
      `);
      moderation.completedThisMonth = r.rows[0]?.c ?? 0;
    } catch (e) { moderation.completedThisMonth = 0; }

    // ===== FINANCE OVERVIEW =====
    try {
      const r = await pool.query(`
        SELECT COUNT(*)::int AS c
        FROM transactions
        WHERE type IN ('withdraw','withdrawal')
          AND status IN ('pending','processing')
      `);
      finance.pendingWithdrawals = r.rows[0]?.c ?? 0;
    } catch (e) { finance.pendingWithdrawals = 0; }

    try {
      const r = await pool.query(`
        SELECT COALESCE(SUM(amount),0)::bigint AS s
        FROM transactions
        WHERE type IN ('withdraw','withdrawal')
          AND status IN ('pending','processing')
      `);
      finance.pendingWithdrawalsAmount = Number(r.rows[0]?.s ?? 0);
    } catch (e) { finance.pendingWithdrawalsAmount = 0; }

    finance.pendingWithdrawalsAmountLabel = formatMoneyUZS(finance.pendingWithdrawalsAmount);

    // ===== CHAT MONITORING =====
    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM chats");
      chatStats.totalChats = r.rows[0]?.c ?? 0;
    } catch (e) { chatStats.totalChats = 0; }

    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM chats WHERE status='blocked'");
      chatStats.blockedChats = r.rows[0]?.c ?? 0;
    } catch (e) { chatStats.blockedChats = 0; }

    try {
      const r = await pool.query(`
        SELECT COUNT(*)::int AS c
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);
      chatStats.messagesLast24h = r.rows[0]?.c ?? 0;
    } catch (e) { chatStats.messagesLast24h = 0; }

    // flagged chats (agar ustun bo‘lsa)
    try {
      const r = await pool.query("SELECT COUNT(*)::int AS c FROM chats WHERE flagged=true");
      chatStats.suspiciousChats = r.rows[0]?.c ?? 0;
    } catch (e) {
      chatStats.suspiciousChats = 0;
    }

    // ===== TOP CLIENTS =====
    try {
      const r = await pool.query(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.username,
          COUNT(j.id)::int AS jobs_count
        FROM jobs j
        JOIN users u ON u.id = j.client_id
        WHERE j.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY jobs_count DESC
        LIMIT 5
      `);
      topClients = r.rows || [];
    } catch (e) { topClients = []; }

    // ===== TOP FREELANCERS =====
    // eng faol freelancer (messages count) — range bo‘yicha
    try {
      const r = await pool.query(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.username,
          COUNT(m.id)::int AS messages_count
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE u.role='freelancer'
          AND m.created_at >= $1
        GROUP BY u.id
        ORDER BY messages_count DESC
        LIMIT 5
      `, [toIso(rangeStart)]);
      topFreelancers = r.rows || [];
    } catch (e) { topFreelancers = []; }

    // ===== RECENT ACTIVITY (mixed) =====
    const activities = [];

    // users created
    try {
      const r = await pool.query(`
        SELECT id, first_name, last_name, username, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `);
      r.rows.forEach(u => {
        const name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "User";
        activities.push({
          type: "user_created",
          name,
          action: "Ro‘yxatdan o‘tdi",
          at: u.created_at,
        });
      });
    } catch (e) {}

    // jobs created
    try {
      const r = await pool.query(`
        SELECT j.title, j.created_at, u.first_name, u.last_name, u.username
        FROM jobs j
        LEFT JOIN users u ON u.id = j.client_id
        WHERE j.deleted_at IS NULL
        ORDER BY j.created_at DESC
        LIMIT 5
      `);
      r.rows.forEach(row => {
        const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username || "Client";
        activities.push({
          type: "job_created",
          name,
          action: row.title ? `Yangi loyiha joylashtirdi (${row.title})` : "Yangi loyiha joylashtirdi",
          at: row.created_at,
        });
      });
    } catch (e) {}

    // disputes opened
    try {
      const r = await pool.query(`
        SELECT created_at
        FROM disputes
        ORDER BY created_at DESC
        LIMIT 5
      `);
      r.rows.forEach(row => {
        activities.push({
          type: "dispute_opened",
          name: "Dispute",
          action: "Yangi dispute ochildi",
          at: row.created_at,
        });
      });
    } catch (e) {}

    // milestones
    try {
      const r = await pool.query(`
        SELECT status, created_at
        FROM milestones
        ORDER BY created_at DESC
        LIMIT 5
      `);
      r.rows.forEach(row => {
        activities.push({
          type: "milestone",
          name: "Milestone",
          action: row.status === "pending"
            ? "Milestone kutilmoqda (pending)"
            : `Milestone status: ${row.status}`,
          at: row.created_at,
        });
      });
    } catch (e) {}

    // payments
    try {
      const r = await pool.query(`
        SELECT type, amount, created_at
        FROM transactions
        WHERE status='completed'
        ORDER BY created_at DESC
        LIMIT 5
      `);
      r.rows.forEach(row => {
        activities.push({
          type: "payment",
          name: "Payment",
          action: `${row.type} yakunlandi (${formatMoneyUZS(row.amount)})`,
          at: row.created_at,
        });
      });
    } catch (e) {}

    // chat blocked
    try {
      const r = await pool.query(`
        SELECT updated_at
        FROM chats
        WHERE status='blocked'
        ORDER BY updated_at DESC
        LIMIT 5
      `);
      r.rows.forEach(row => {
        activities.push({
          type: "chat_blocked",
          name: "Chat",
          action: "Chat admin tomonidan bloklandi",
          at: row.updated_at,
        });
      });
    } catch (e) {}

    // sort by at desc and take 10
    recentActivity = activities
      .filter(a => a.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10)
      .map(a => ({
        name: a.name,
        action: a.action,
        time: timeAgoUz(a.at),
        type: a.type,
        at: a.at,
      }));

    // ===== RESPONSE =====
    return res.json({
      success: true,
      data: {
        range,
        stats,
        breakdown,
        finance,
        moderation: {
          blockedUsers: moderation.blockedUsers || 0,
          openDisputes: moderation.openDisputes || 0,
          pendingMilestones: moderation.pendingMilestones || 0,
          completedThisMonth: moderation.completedThisMonth || 0,
        },
        chatStats: {
          totalChats: chatStats.totalChats || 0,
          blockedChats: chatStats.blockedChats || 0,
          messagesLast24h: chatStats.messagesLast24h || 0,
          suspiciousChats: chatStats.suspiciousChats || 0,
        },
        topClients,
        topFreelancers,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Dashboard ma'lumotlarini olishda xato yuz berdi.",
      error: error.message,
    });
  }
};


/**
 * GET /admin/users
 * Barcha foydalanuvchilar ro‘yxati
 */
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, username, email, phone, role, first_name, last_name, display_name,
        is_verified, balance_uzs, balance_usd, created_at, updated_at, status
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: {
        users: result.rows
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchilarni olishda xato yuz berdi.'
    });
  }
};



// src/controllers/adminController.js
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) user info (status ham qo'shildi)
    const userRes = await pool.query(
      `
      SELECT 
        id, username, first_name, last_name, email, phone, role, status,
        is_verified, is_premium, balance_uzs, balance_usd, created_at
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi." });
    }

    const user = userRes.rows[0];

    // 2) jobs summary + recent jobs
    let jobsSummary = {
      active: 0,        // open + in_progress
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    };

    let recentJobs = [];

    if (user.role === "freelancer") {
      // Freelancer: proposals -> jobs
      const jobsRes = await pool.query(
        `
        SELECT 
          j.id,
          j.title,
          j.status,
          j.budget_min,
          j.budget_max,
          j.currency,
          j.created_at,
          pr.status as proposal_status
        FROM proposals pr
        JOIN jobs j ON j.id = pr.job_id
        WHERE pr.freelancer_id = $1
          AND j.deleted_at IS NULL
        ORDER BY j.created_at DESC
        LIMIT 50
        `,
        [id]
      );

      recentJobs = jobsRes.rows.map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        budget: j.budget_min != null && j.budget_max != null
          ? `${Number(j.budget_min).toLocaleString()} - ${Number(j.budget_max).toLocaleString()} ${j.currency || "UZS"}`
          : "Belgilanmagan",
        created_at: j.created_at,
        proposal_status: j.proposal_status,
      }));

    } else if (user.role === "client") {
      // Client: jobs.client_id
      const jobsRes = await pool.query(
        `
        SELECT 
          id,
          title,
          status,
          budget_min,
          budget_max,
          currency,
          created_at
        FROM jobs
        WHERE client_id = $1
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 50
        `,
        [id]
      );

      recentJobs = jobsRes.rows.map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        budget: j.budget_min != null && j.budget_max != null
          ? `${Number(j.budget_min).toLocaleString()} - ${Number(j.budget_max).toLocaleString()} ${j.currency || "UZS"}`
          : "Belgilanmagan",
        created_at: j.created_at,
      }));
    }

    // 3) summary hisoblash
    const statusCount = (s) => recentJobs.filter((x) => x.status === s).length;

    jobsSummary.in_progress = statusCount("in_progress");
    jobsSummary.completed = statusCount("completed");
    jobsSummary.cancelled = statusCount("cancelled");
    jobsSummary.active = recentJobs.filter((x) => x.status === "open" || x.status === "in_progress").length;
    jobsSummary.total = recentJobs.length;

    return res.json({
      success: true,
      data: {
        user: {
          ...user,
          jobs_summary: jobsSummary,
          recent_jobs: recentJobs,
        },
      },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Foydalanuvchi tafsilotlarini olishda xato.",
      error: error.message,
    });
  }
};



/**
 * GET /admin/jobs
 * Barcha loyihalar ro‘yxati (jobs table dan)
 */
const getJobs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.title, 
        p.description, 
        p.budget_min || ' - ' || p.budget_max || ' ' || p.currency AS budget,
        p.status, 
        p.is_boosted AS boosted, 
        p.created_at,
        u.first_name || ' ' || u.last_name AS client_name,
        u.username AS client_username
      FROM jobs p
      JOIN users u ON p.client_id = u.id
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      data: {
        jobs: result.rows
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Loyihalarni olishda xato yuz berdi.'
    });
  }
};

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.id, p.title, p.description, p.budget_min, p.budget_max, p.currency,
        p.status, p.is_boosted, p.created_at, p.deadline, p.required_skills,
        u.first_name || ' ' || u.last_name AS client_name,
        u.username AS client_username
      FROM jobs p
      JOIN users u ON p.client_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi.' });
    }

    res.json({
      success: true,
      data: { job: result.rows[0] }
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({ success: false, message: 'Loyiha tafsilotlarini olishda xato.' });
  }
};
/**
 * GET /admin/payments
 * Barcha tranzaksiyalar
 */
const getPayments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.type, t.amount, t.gateway, t.status, t.created_at,
        u.first_name || ' ' || u.last_name AS user_name,
        u.username
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 200
    `);

    res.json({
      success: true,
      data: {
        transactions: result.rows
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'To‘lovlarni olishda xato yuz berdi.'
    });
  }
};

/**
 * GET /admin/chats
 * So‘nggi chatlar (misol – keyin real qilamiz)
 */
const getChats = async (req, res) => {
  try {
    // Hozircha mock – keyin real chat table bilan almashtiramiz
    const mockChats = [
      { id: 1, jobTitle: "React JS sayt", client: "Kamola Company", freelancer: "Ogabek Dev", lastMessage: "Admin panel ishlayapti", lastMessageTime: "5 daqiqa oldin", unreadCount: 3 },
      { id: 2, jobTitle: "Logo dizayn", client: "Shaxsiy", freelancer: "Sardor Designer", lastMessage: "Yangi variantni yubordim", lastMessageTime: "1 soat oldin", unreadCount: 0 },
      { id: 3, jobTitle: "Flutter ilova", client: "Tech Startup", freelancer: "Ali Pro", lastMessage: "Ilova yuklandi", lastMessageTime: "2 kun oldin", unreadCount: 0 },
    ];

    res.json({
      success: true,
      data: { chats: mockChats }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Chatlarni olishda xato.'
    });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      first_name,
      last_name,
      username,
      email,
      phone,
      role,
      status, // xohlasangiz editdan ham o‘zgartirasiz
    } = req.body;

    // role va status validatsiya (ixtiyoriy, lekin foydali)
    const allowedRoles = ['admin', 'client', 'freelancer'];
    const allowedStatuses = ['active', 'blocked'];

    if (role !== undefined && !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "role noto‘g‘ri." });
    }
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "status faqat 'active' yoki 'blocked'." });
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const push = (col, val) => {
      updateFields.push(`${col} = $${paramIndex++}`);
      updateValues.push(val);
    };

    if (first_name !== undefined) push("first_name", first_name);
    if (last_name !== undefined) push("last_name", last_name);
    if (username !== undefined) push("username", username);
    if (email !== undefined) push("email", email);
    if (phone !== undefined) push("phone", phone);
    if (role !== undefined) push("role", role);
    if (status !== undefined) push("status", status);

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Yangilash uchun kamida 1 ta maydon yuboring."
      });
    }

    updateValues.push(id);

    const query = `
      UPDATE users
      SET ${updateFields.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING 
        id, username, first_name, last_name, email, phone, role, status,
        is_verified, is_premium, balance_uzs, balance_usd, created_at, updated_at
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User topilmadi." });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] },
      message: "User muvaffaqiyatli yangilandi."
    });
  } catch (error) {
    console.error("updateUserByAdmin error:", error);
    res.status(500).json({
      success: false,
      message: "User yangilashda xato yuz berdi.",
      error: error.message
    });
  }
};

const updateUserStatusByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "active" | "blocked"

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status faqat 'active' yoki 'blocked' bo‘lishi kerak."
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id, username, first_name, last_name, email, phone, role, status,
        is_verified, is_premium, balance_uzs, balance_usd, created_at, updated_at
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User topilmadi." });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] },
      message: "User status yangilandi."
    });
  } catch (error) {
    console.error("updateUserStatusByAdmin error:", error);
    res.status(500).json({
      success: false,
      message: "User status yangilashda xato yuz berdi.",
      error: error.message
    });
  }
};



module.exports = {
  isAdmin,
  getDashboardStats,
  getUsers,
  getUserById,
  getJobs,
  getPayments,
  getChats,
  getJobById,
  updateUserByAdmin,
  updateUserStatusByAdmin
};