// src/controllers/adminController.js
const pool = require('../db/pool');

/**
 * Admin middleware – foydalanuvchi admin ekanligini tekshiradi
 * authenticate middleware req.user ni qo'yib beradi
 */
const isAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Faqat admin foydalanuvchilar kirishi mumkin.',
      });
    }
    next();
  } catch (error) {
    console.error('isAdmin error:', error);
    res.status(500).json({ success: false, message: 'Xato yuz berdi.' });
  }
};

// ====== Helpers ======
const getRangeStart = (range) => {
  const now = new Date();
  const start = new Date(now);

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === '7d') {
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

  if (range === 'today') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === '7d') {
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
    if (sec < 60) return 'hozirgina';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} daqiqa oldin`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} soat oldin`;
    const day = Math.floor(hr / 24);
    return `${day} kun oldin`;
  } catch {
    return '—';
  }
};

/**
 * GET /admin/dashboard
 * Dashboard uchun real statistika
 */
const getDashboardStats = async (req, res) => {
  const range = String(req.query.range || '30d');
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
    const totalUsersRes = await pool.query('SELECT COUNT(*)::int AS c FROM users');
    stats.totalUsers = totalUsersRes.rows[0]?.c ?? 0;

    const freelancersRes = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE role='freelancer'");
    stats.totalFreelancers = freelancersRes.rows[0]?.c ?? 0;

    const clientsRes = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE role='client'");
    stats.totalClients = clientsRes.rows[0]?.c ?? 0;

    const blockedRes = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE status='blocked'");
    moderation.blockedUsers = blockedRes.rows[0]?.c ?? 0;

    // ===== ACTIVE JOBS =====
    const activeJobsRes = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM jobs
      WHERE deleted_at IS NULL
        AND status IN ('open','in_progress')
    `);
    stats.activeJobs = activeJobsRes.rows[0]?.c ?? 0;

    // ===== RANGE: new users/jobs =====
    const newUsersRes = await pool.query(
      'SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1',
      [toIso(rangeStart)]
    );
    const newUsers = newUsersRes.rows[0]?.c ?? 0;

    const prevNewUsersRes = await pool.query(
      'SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1 AND created_at < $2',
      [toIso(prevStart), toIso(rangeStart)]
    );
    const prevNewUsers = prevNewUsersRes.rows[0]?.c ?? 0;

    const newJobsRes = await pool.query(
      'SELECT COUNT(*)::int AS c FROM jobs WHERE created_at >= $1 AND deleted_at IS NULL',
      [toIso(rangeStart)]
    );
    const newJobs = newJobsRes.rows[0]?.c ?? 0;

    const prevNewJobsRes = await pool.query(
      'SELECT COUNT(*)::int AS c FROM jobs WHERE created_at >= $1 AND created_at < $2 AND deleted_at IS NULL',
      [toIso(prevStart), toIso(rangeStart)]
    );
    const prevNewJobs = prevNewJobsRes.rows[0]?.c ?? 0;

    stats.newUsers = newUsers;
    stats.newJobs = newJobs;

    stats.usersGrowthPct = pct(newUsers, prevNewUsers);
    stats.jobsGrowthPct = pct(newJobs, prevNewJobs);

    // ===== FINANCIAL METRICS =====
    // GMV = escrow_release, Platform Revenue = fee, Deposit Volume = deposit
    const gmvRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS s
       FROM transactions
       WHERE status='completed'
         AND type='escrow_release'
         AND created_at >= $1`,
      [toIso(rangeStart)]
    );
    const gmv = Number(gmvRes.rows[0]?.s ?? 0);

    const prevGmvRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS s
       FROM transactions
       WHERE status='completed'
         AND type='escrow_release'
         AND created_at >= $1
         AND created_at < $2`,
      [toIso(prevStart), toIso(rangeStart)]
    );
    const prevGmv = Number(prevGmvRes.rows[0]?.s ?? 0);

    const feeRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS s
       FROM transactions
       WHERE status='completed'
         AND type='fee'
         AND created_at >= $1`,
      [toIso(rangeStart)]
    );
    const platformRevenue = Number(feeRes.rows[0]?.s ?? 0);

    const prevFeeRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS s
       FROM transactions
       WHERE status='completed'
         AND type='fee'
         AND created_at >= $1
         AND created_at < $2`,
      [toIso(prevStart), toIso(rangeStart)]
    );
    const prevPlatformRevenue = Number(prevFeeRes.rows[0]?.s ?? 0);

    const depRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS s
       FROM transactions
       WHERE status='completed'
         AND type='deposit'
         AND created_at >= $1`,
      [toIso(rangeStart)]
    );
    const depositVolume = Number(depRes.rows[0]?.s ?? 0);

    const prevDepRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS s
       FROM transactions
       WHERE status='completed'
         AND type='deposit'
         AND created_at >= $1
         AND created_at < $2`,
      [toIso(prevStart), toIso(rangeStart)]
    );
    const prevDepositVolume = Number(prevDepRes.rows[0]?.s ?? 0);

    stats.gmv = gmv;
    stats.platformRevenue = platformRevenue;
    stats.depositVolume = depositVolume;

    stats.gmvLabel = formatMoneyUZS(gmv);
    stats.platformRevenueLabel = formatMoneyUZS(platformRevenue);
    stats.depositVolumeLabel = formatMoneyUZS(depositVolume);

    stats.gmvGrowthPct = pct(gmv, prevGmv);
    stats.platformRevenueGrowthPct = pct(platformRevenue, prevPlatformRevenue);
    stats.depositVolumeGrowthPct = pct(depositVolume, prevDepositVolume);

    // backward compatibility
    stats.totalRevenue = gmv;
    stats.totalRevenueLabel = formatMoneyUZS(gmv);
    stats.platformFee = platformRevenue;
    stats.platformFeeLabel = formatMoneyUZS(platformRevenue);

    // ===== JOB STATUS BREAKDOWN =====
    const jobBreakRes = await pool.query(`
      SELECT status, COUNT(*)::int AS c
      FROM jobs
      WHERE deleted_at IS NULL
      GROUP BY status
    `);
    const map = {};
    jobBreakRes.rows.forEach((x) => { map[x.status] = x.c; });
    breakdown.jobs = {
      open: map.open || 0,
      in_progress: map.in_progress || 0,
      completed: map.completed || 0,
      cancelled: map.cancelled || 0,
    };

    // ===== QUICK STATS =====
    const openDispRes = await pool.query("SELECT COUNT(*)::int AS c FROM disputes WHERE status='open'");
    moderation.openDisputes = openDispRes.rows[0]?.c ?? 0;

    const pendingMilRes = await pool.query("SELECT COUNT(*)::int AS c FROM milestones WHERE status='pending'");
    moderation.pendingMilestones = pendingMilRes.rows[0]?.c ?? 0;

    const approvedThisMonthRes = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM milestones
      WHERE status='approved'
        AND approved_at >= date_trunc('month', CURRENT_DATE)
    `);
    moderation.completedThisMonth = approvedThisMonthRes.rows[0]?.c ?? 0;

    // ===== FINANCE OVERVIEW =====
    const pendingWRes = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM transactions
      WHERE type='withdrawal'
        AND status IN ('pending','processing')
    `);
    finance.pendingWithdrawals = pendingWRes.rows[0]?.c ?? 0;

    const pendingWAmtRes = await pool.query(`
      SELECT COALESCE(SUM(amount),0)::numeric AS s
      FROM transactions
      WHERE type='withdrawal'
        AND status IN ('pending','processing')
    `);
    finance.pendingWithdrawalsAmount = Number(pendingWAmtRes.rows[0]?.s ?? 0);
    finance.pendingWithdrawalsAmountLabel = formatMoneyUZS(finance.pendingWithdrawalsAmount);

    // ===== CHAT MONITORING =====
    const totalChatsRes = await pool.query('SELECT COUNT(*)::int AS c FROM chats');
    chatStats.totalChats = totalChatsRes.rows[0]?.c ?? 0;

    const blockedChatsRes = await pool.query("SELECT COUNT(*)::int AS c FROM chats WHERE status='blocked'");
    chatStats.blockedChats = blockedChatsRes.rows[0]?.c ?? 0;

    const msg24Res = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    chatStats.messagesLast24h = msg24Res.rows[0]?.c ?? 0;

    // ⚠️ flagged column yo‘q → 0
    chatStats.suspiciousChats = 0;

    // ===== TOP CLIENTS =====
    const topClientsRes = await pool.query(`
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
    topClients = topClientsRes.rows || [];

    // ===== TOP FREELANCERS =====
    const topFreeRes = await pool.query(`
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
    topFreelancers = topFreeRes.rows || [];

    // ===== RECENT ACTIVITY =====
    const activities = [];

    const lastUsersRes = await pool.query(`
      SELECT first_name, last_name, username, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);
    lastUsersRes.rows.forEach((u) => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'User';
      activities.push({ type: 'user_created', name, action: "Ro‘yxatdan o‘tdi", at: u.created_at });
    });

    const lastJobsRes = await pool.query(`
      SELECT j.title, j.created_at, u.first_name, u.last_name, u.username
      FROM jobs j
      LEFT JOIN users u ON u.id = j.client_id
      WHERE j.deleted_at IS NULL
      ORDER BY j.created_at DESC
      LIMIT 5
    `);
    lastJobsRes.rows.forEach((row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.username || 'Client';
      activities.push({
        type: 'job_created',
        name,
        action: row.title ? `Yangi loyiha joylashtirdi (${row.title})` : 'Yangi loyiha joylashtirdi',
        at: row.created_at,
      });
    });

    const lastDispRes = await pool.query(`
      SELECT created_at
      FROM disputes
      ORDER BY created_at DESC
      LIMIT 5
    `);
    lastDispRes.rows.forEach((row) => {
      activities.push({ type: 'dispute_opened', name: 'Dispute', action: 'Yangi dispute ochildi', at: row.created_at });
    });

    const lastMilRes = await pool.query(`
      SELECT status, created_at
      FROM milestones
      ORDER BY created_at DESC
      LIMIT 5
    `);
    lastMilRes.rows.forEach((row) => {
      activities.push({
        type: 'milestone',
        name: 'Milestone',
        action: row.status === 'pending' ? 'Milestone kutilmoqda (pending)' : `Milestone status: ${row.status}`,
        at: row.created_at,
      });
    });

    const lastTxRes = await pool.query(`
      SELECT type, amount, created_at
      FROM transactions
      WHERE status='completed'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    lastTxRes.rows.forEach((row) => {
      activities.push({
        type: 'payment',
        name: 'Payment',
        action: `${row.type} yakunlandi (${formatMoneyUZS(row.amount)})`,
        at: row.created_at,
      });
    });

    const lastBlockedChatsRes = await pool.query(`
      SELECT created_at
      FROM chats
      WHERE status='blocked'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    lastBlockedChatsRes.rows.forEach((row) => {
      activities.push({ type: 'chat_blocked', name: 'Chat', action: 'Chat admin tomonidan bloklandi', at: row.created_at });
    });

    recentActivity = activities
      .filter((a) => a.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10)
      .map((a) => ({
        name: a.name,
        action: a.action,
        time: timeAgoUz(a.at),
        type: a.type,
        at: a.at,
      }));

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
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: "Dashboard ma'lumotlarini olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /admin/users
 * Barcha foydalanuvchilar ro‘yxati (balans user_balances dan)
 * Query params: ?limit=50&offset=0
 */
const getUsers = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const result = await pool.query(
      `
      SELECT 
        u.id, u.username, u.email, u.phone, u.role, u.first_name, u.last_name, u.display_name,
        u.is_verified, u.is_premium, u.premium_until,
        u.created_at, u.updated_at, u.status,
        COALESCE(ub.available_balance, 0) AS available_balance,
        COALESCE(ub.escrow_balance, 0)    AS escrow_balance,
        COALESCE(ub.total_spent, 0)       AS total_spent,
        COALESCE(ub.total_earned, 0)      AS total_earned
      FROM users u
      LEFT JOIN user_balances ub ON ub.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({ success: true, data: { users: result.rows, limit, offset } });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Foydalanuvchilarni olishda xato yuz berdi.' });
  }
};

/**
 * GET /admin/users/:id
 * User tafsilotlari (balans user_balances dan)
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await pool.query(
      `
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.is_verified,
        u.is_premium,
        u.premium_until,
        u.created_at,
        u.updated_at,
        COALESCE(ub.available_balance, 0) AS available_balance,
        COALESCE(ub.escrow_balance, 0)    AS escrow_balance,
        COALESCE(ub.total_spent, 0)       AS total_spent,
        COALESCE(ub.total_earned, 0)      AS total_earned
      FROM users u
      LEFT JOIN user_balances ub ON ub.user_id = u.id
      WHERE u.id = $1
      `,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    const user = userRes.rows[0];

    // recent jobs/proposals
    let recentJobs = [];
    if (user.role === 'freelancer') {
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
        budget:
          j.budget_min != null && j.budget_max != null
            ? `${Number(j.budget_min).toLocaleString()} - ${Number(j.budget_max).toLocaleString()} ${j.currency || 'UZS'}`
            : 'Belgilanmagan',
        created_at: j.created_at,
        proposal_status: j.proposal_status,
      }));
    } else if (user.role === 'client') {
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
        budget:
          j.budget_min != null && j.budget_max != null
            ? `${Number(j.budget_min).toLocaleString()} - ${Number(j.budget_max).toLocaleString()} ${j.currency || 'UZS'}`
            : 'Belgilanmagan',
        created_at: j.created_at,
      }));
    }

    const statusCount = (s) => recentJobs.filter((x) => x.status === s).length;

    const jobsSummary = {
      in_progress: statusCount('in_progress'),
      completed: statusCount('completed'),
      cancelled: statusCount('cancelled'),
      active: recentJobs.filter((x) => x.status === 'open' || x.status === 'in_progress').length,
      total: recentJobs.length,
    };

    return res.json({
      success: true,
      data: { user: { ...user, jobs_summary: jobsSummary, recent_jobs: recentJobs } },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({
      success: false,
      message: "Foydalanuvchi tafsilotlarini olishda xato.",
      error: error.message,
    });
  }
};

/**
 * GET /admin/jobs
 * Query: ?limit=50&offset=0
 */
const getJobs = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const result = await pool.query(
      `
      SELECT 
        j.id, 
        j.title, 
        j.description, 
        CONCAT(
          COALESCE(j.budget_min::text, ''),
          CASE WHEN j.budget_min IS NOT NULL AND j.budget_max IS NOT NULL THEN ' - ' ELSE '' END,
          COALESCE(j.budget_max::text, ''),
          ' ',
          COALESCE(j.currency, 'UZS')
        ) AS budget,
        j.status, 
        j.is_boosted AS boosted, 
        j.created_at,
        CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS client_name,
        u.username AS client_username
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      WHERE j.deleted_at IS NULL
      ORDER BY j.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({ success: true, data: { jobs: result.rows, limit, offset } });
  } catch (error) {
    console.error('Get jobs error:', error.message);
    res.status(500).json({ success: false, message: 'Loyihalarni olishda xato yuz berdi.' });
  }
};

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        j.id, j.title, j.description, j.budget_min, j.budget_max, j.currency,
        j.status, j.is_boosted, j.created_at, j.deadline, j.required_skills,
        CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS client_name,
        u.username AS client_username
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      WHERE j.id = $1 AND j.deleted_at IS NULL
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi.' });
    }

    res.json({ success: true, data: { job: result.rows[0] } });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({ success: false, message: 'Loyiha tafsilotlarini olishda xato.' });
  }
};

/**
 * GET /admin/payments
 * ?limit=200&offset=0
 */
const getPayments = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Number(req.query.offset) || 0;

    const result = await pool.query(
      `
      SELECT 
        t.id, t.type, t.amount, t.gateway, t.status, t.created_at,
        CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS user_name,
        u.username
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({ success: true, data: { transactions: result.rows, limit, offset } });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: "To‘lovlarni olishda xato yuz berdi." });
  }
};

/**
 * GET /admin/chats
 * Real chat list (last message, unread count, job title, contract participants)
 * ?limit=50&offset=0
 */
const getChats = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const result = await pool.query(
      `
      SELECT
        ch.id,
        ch.status,
        ch.created_at,

        j.id AS job_id,
        j.title AS job_title,

        c.id AS contract_id,
        c.client_id,
        c.freelancer_id,

        CONCAT(COALESCE(cu.first_name,''),' ',COALESCE(cu.last_name,'')) AS client_name,
        cu.username AS client_username,

        CONCAT(COALESCE(fu.first_name,''),' ',COALESCE(fu.last_name,'')) AS freelancer_name,
        fu.username AS freelancer_username,

        lm.content AS last_message,
        lm.created_at AS last_message_at,

        COALESCE(uc.unread_count, 0) AS unread_count
      FROM chats ch
      LEFT JOIN jobs j ON j.id = ch.job_id
      LEFT JOIN contracts c ON c.id = ch.contract_id
      LEFT JOIN users cu ON cu.id = c.client_id
      LEFT JOIN users fu ON fu.id = c.freelancer_id

      -- last message
      LEFT JOIN LATERAL (
        SELECT m.content, m.created_at
        FROM messages m
        WHERE m.chat_id = ch.id
          AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON true

      -- unread count (overall)
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS unread_count
        FROM messages m
        WHERE m.chat_id = ch.id
          AND m.is_read = false
          AND m.deleted_at IS NULL
      ) uc ON true

      ORDER BY COALESCE(lm.created_at, ch.created_at) DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({
      success: true,
      data: { chats: result.rows, limit, offset },
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ success: false, message: 'Chatlarni olishda xato.' });
  }
};

const updateUserByAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const { first_name, last_name, username, email, phone, role, status } = req.body;

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
    let i = 1;

    const push = (col, val) => {
      updateFields.push(`${col} = $${i++}`);
      updateValues.push(val);
    };

    if (first_name !== undefined) push('first_name', first_name);
    if (last_name !== undefined) push('last_name', last_name);
    if (username !== undefined) push('username', username);
    if (email !== undefined) push('email', email);
    if (phone !== undefined) push('phone', phone);
    if (role !== undefined) push('role', role);
    if (status !== undefined) push('status', status);

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Yangilash uchun kamida 1 ta maydon yuboring.' });
    }

    await client.query('BEGIN');

    updateValues.push(id);
    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${i}
      RETURNING id
    `;
    const upd = await client.query(updateQuery, updateValues);

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'User topilmadi.' });
    }

    // user_balances row yo‘q bo‘lsa yaratib qo‘yamiz
    await client.query(
      `
      INSERT INTO user_balances (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [id]
    );

    const out = await client.query(
      `
      SELECT 
        u.id, u.username, u.first_name, u.last_name, u.email, u.phone, u.role, u.status,
        u.is_verified, u.is_premium, u.premium_until, u.created_at, u.updated_at,
        COALESCE(ub.available_balance,0) AS available_balance,
        COALESCE(ub.escrow_balance,0)    AS escrow_balance,
        COALESCE(ub.total_spent,0)       AS total_spent,
        COALESCE(ub.total_earned,0)      AS total_earned
      FROM users u
      LEFT JOIN user_balances ub ON ub.user_id = u.id
      WHERE u.id = $1
      `,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: { user: out.rows[0] },
      message: 'User muvaffaqiyatli yangilandi.',
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('updateUserByAdmin error:', error);
    res.status(500).json({ success: false, message: 'User yangilashda xato yuz berdi.', error: error.message });
  } finally {
    client.release();
  }
};

const updateUserStatusByAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status faqat 'active' yoki 'blocked' bo‘lishi kerak.",
      });
    }

    await client.query('BEGIN');

    const upd = await client.query(
      `
      UPDATE users
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
      `,
      [status, id]
    );

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'User topilmadi.' });
    }

    await client.query(
      `
      INSERT INTO user_balances (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [id]
    );

    const out = await client.query(
      `
      SELECT 
        u.id, u.username, u.first_name, u.last_name, u.email, u.phone, u.role, u.status,
        u.is_verified, u.is_premium, u.premium_until, u.created_at, u.updated_at,
        COALESCE(ub.available_balance,0) AS available_balance,
        COALESCE(ub.escrow_balance,0)    AS escrow_balance,
        COALESCE(ub.total_spent,0)       AS total_spent,
        COALESCE(ub.total_earned,0)      AS total_earned
      FROM users u
      LEFT JOIN user_balances ub ON ub.user_id = u.id
      WHERE u.id = $1
      `,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: { user: out.rows[0] },
      message: 'User status yangilandi.',
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('updateUserStatusByAdmin error:', error);
    res.status(500).json({ success: false, message: 'User status yangilashda xato yuz berdi.', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  isAdmin,
  getDashboardStats,
  getUsers,
  getUserById,
  getJobs,
  getJobById,
  getPayments,
  getChats,
  updateUserByAdmin,
  updateUserStatusByAdmin,
};
