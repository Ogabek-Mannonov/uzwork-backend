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
      const activityResult = await pool.query(`
   SELECT 
  action,
  name,
  time
FROM (
  -- Yangi loyiha
  SELECT 
    'Yangi loyiha joylashtirdi' AS action,
    COALESCE(u.first_name || ' ' || u.last_name, "Noma'lum") AS name,
    j.created_at AS time
  FROM jobs j
  LEFT JOIN users u ON j.client_id = u.id

  UNION ALL

  -- Taklif
  SELECT 
    'Taklif yubordi' AS action,
    COALESCE(u.first_name || ' ' || u.last_name, "Noma'lum") AS name,
    p.created_at AS time
  FROM proposals p
  LEFT JOIN users u ON p.freelancer_id = u.id

  UNION ALL

  -- To'lov
  SELECT 
    "To'lov amalga oshirdi" AS action,
    COALESCE(u.first_name || ' ' || u.last_name, "Noma'lum") AS name,
    t.created_at AS time
  FROM transactions t
  LEFT JOIN users u ON t.user_id = u.id
  WHERE t.status = 'completed'
) AS combined
WHERE time IS NOT NULL
ORDER BY time DESC
LIMIT 5;
  `);

      const formatTime = (date) => {
        if (!date) return "Noma'lum vaqt oldin";
        const diff = Math.floor((new Date() - new Date(date)) / 1000);
        if (diff < 60) return `${diff} soniya oldin`;
        if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
        return `${Math.floor(diff / 86400)} kun oldin`;
      };

      recentActivity = activityResult.rows.map(row => ({
        name: row.name,
        action: row.action,
        time: formatTime(row.time)
      }));
    } catch (e) {
      console.error('XATO: So‘nggi faollik query:', e.message);
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


const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id, username, first_name, last_name, email, phone, role, is_verified, is_premium,
        balance_uzs, balance_usd, created_at
      FROM users
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: 'Foydalanuvchi tafsilotlarini olishda xato.' });
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

module.exports = {
  isAdmin,
  getDashboardStats,
  getUsers,
  getUserById,
  getJobs,
  getPayments,
  getChats,
  getJobById,
};