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

/**
 * GET /admin/dashboard
 * Dashboard uchun real statistika
 */
// src/controllers/adminController.js
const getDashboardStats = async (req, res) => {
  try {
    const stats = {};
    const quickStats = {};
    let recentActivity = [];

    // 1. Jami foydalanuvchilar
    try {
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      stats.totalUsers = parseInt(usersCount.rows[0].count);
    } catch (e) { console.error('XATO: Jami users count:', e.message); stats.totalUsers = 0; }

    // 2. Freelancerlar soni
    try {
      const freelancersCount = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['freelancer']);
      stats.totalFreelancers = parseInt(freelancersCount.rows[0].count);
    } catch (e) { console.error('XATO: Freelancers count:', e.message); stats.totalFreelancers = 0; }

    // 3. Clientlar soni
    try {
      const clientsCount = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['client']);
      stats.totalClients = parseInt(clientsCount.rows[0].count);
    } catch (e) { console.error('XATO: Clients count:', e.message); stats.totalClients = 0; }

    // 4. Faol loyihalar
    try {
      const activeJobs = await pool.query('SELECT COUNT(*) FROM jobs WHERE status IN ($1, $2)', ['open', 'in_progress']);
      stats.activeJobs = parseInt(activeJobs.rows[0].count);
    } catch (e) { console.error('XATO: Active jobs count:', e.message); stats.activeJobs = 0; }

    // 5. Umumiy daromad va platforma haqi
    try {
      const totalRevenue = await pool.query('SELECT COALESCE(SUM(amount), 0) as total_fee FROM transactions WHERE type = $1 AND status = $2', ['platform_fee', 'completed']);
      const fee = parseInt(totalRevenue.rows[0].total_fee);
      stats.totalRevenue = `${fee.toLocaleString()} so‘m`;
      stats.platformFee = `${fee.toLocaleString()} so‘m`;
    } catch (e) { console.error('XATO: Total revenue:', e.message); stats.totalRevenue = "0 so‘m"; stats.platformFee = "0 so‘m"; }

    // 6. Ochiq nizolar
    try {
      const openDisputes = await pool.query('SELECT COUNT(*) FROM disputes WHERE status = $1', ['open']);
      quickStats.openDisputes = parseInt(openDisputes.rows[0].count);
    } catch (e) { console.error('XATO: Open disputes:', e.message); quickStats.openDisputes = 0; }

    // 7. Kutilayotgan milestone lar
    try {
      const pending = await pool.query('SELECT COUNT(*) FROM milestones WHERE status = $1', ['pending']);
      quickStats.pendingMilestones = parseInt(pending.rows[0].count);
    } catch (e) { console.error('XATO: Pending milestones:', e.message); quickStats.pendingMilestones = 0; }

    // 8. Bu oyda tugallangan milestone lar
    try {
      const completed = await pool.query(`
        SELECT COUNT(*) 
        FROM milestones 
        WHERE status = 'approved' 
        AND approved_at >= date_trunc('month', CURRENT_DATE)
      `);
      quickStats.completedThisMonth = parseInt(completed.rows[0].count);
    } catch (e) { console.error('XATO: Completed this month:', e.message); quickStats.completedThisMonth = 0; }

    // 9. So‘nggi faollik (eng muhim qism – xato shu yerda bo‘lishi mumkin)
    try {
  const result = await pool.query(`
    SELECT 
      'Yangi loyiha joylashtirdi' AS action,
      COALESCE(u.first_name || ' ' || u.last_name, 'Nomalum mijoz') AS name,
      j.title AS project_title,
      j.created_at AS time
    FROM jobs j
    LEFT JOIN users u ON j.client_id = u.id
    WHERE j.created_at IS NOT NULL
    ORDER BY j.created_at DESC
    LIMIT 5
  `);

  const now = new Date();
  recentActivity = result.rows.map(row => {
    let timeAgo = 'hozirgina';
    if (row.time) {
      const diffMs = now - new Date(row.time);
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec > 60) timeAgo = `${Math.floor(diffSec / 60)} daqiqa oldin`;
      if (diffSec > 3600) timeAgo = `${Math.floor(diffSec / 3600)} soat oldin`;
      if (diffSec > 86400) timeAgo = `${Math.floor(diffSec / 86400)} kun oldin`;
    }

    return {
      name: row.name,
      action: row.project_title 
        ? `${row.action} (${row.project_title})` 
        : row.action,
      time: timeAgo
    };
  });

  console.log('Songgi faollik natijasi (jobsdan):', recentActivity);
} catch (err) {
  console.error('Songgi faollik xatosi:', err.message);
  recentActivity = [];
}
    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: stats.totalUsers || 0,
          totalFreelancers: stats.totalFreelancers || 0,
          totalClients: stats.totalClients || 0,
          activeJobs: stats.activeJobs || 0,
          totalRevenue: stats.totalRevenue || "0 so‘m",
          platformFee: stats.platformFee || "0 so‘m",
          usersGrowth: "+12.5%",
          jobsGrowth: "+8.3%",
          revenueGrowth: "+23.1%",
          feeGrowth: "+18.7%",
        },
        recentActivity,
        quickStats: {
          pendingMilestones: quickStats.pendingMilestones || 0,
          completedThisMonth: quickStats.completedThisMonth || 0,
          openDisputes: quickStats.openDisputes || 0,
        }
      }
    });
  } catch (error) {
    console.error('Dashboard umumiy xatosi:', error.message);
    res.status(500).json({
      success: false,
      message: 'Dashboard ma\'lumotlarini olishda xato yuz berdi.'
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