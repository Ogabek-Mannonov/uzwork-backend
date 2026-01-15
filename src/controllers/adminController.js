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
    const [
      usersCount,
      freelancersCount,
      clientsCount,
      activeJobs,
      totalRevenue,
      openDisputes,
      pendingMilestones,
      completedThisMonth,
      recentActivity
    ] = await Promise.all([
      // Asosiy statistika (sizda allaqachon bor)
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['freelancer']),
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['client']),
      pool.query('SELECT COUNT(*) FROM jobs WHERE status IN ($1, $2)', ['open', 'in_progress']),
      pool.query('SELECT COALESCE(SUM(amount), 0) as total_fee FROM transactions WHERE type = $1 AND status = $2', ['platform_fee', 'completed']),
      pool.query('SELECT COUNT(*) FROM disputes WHERE status = $1', ['open']),

      // Tezkor statistika - real
      pool.query('SELECT COUNT(*) FROM milestones WHERE status = $1', ['pending']),
      pool.query(`
        SELECT COUNT(*) 
        FROM milestones 
        WHERE status = 'approved' 
        AND approved_at >= date_trunc('month', CURRENT_DATE)
      `),

      // So‘nggi faollik - real (oxirgi 5 ta harakat)
      pool.query(`
        SELECT 
          CASE 
            WHEN j.id IS NOT NULL THEN 'Yangi loyiha joylashtirdi'
            WHEN p.id IS NOT NULL THEN 'Taklif yubordi'
            WHEN t.id IS NOT NULL THEN 'To\'lov amalga oshirdi'
            ELSE 'Boshqa harakat'
          END as action,
          COALESCE(u.first_name || ' ' || u.last_name, 'Noma\'lum') as name,
          COALESCE(j.created_at, p.created_at, t.created_at) as time
        FROM (
          SELECT 'job' as type, id, client_id as user_id, created_at FROM jobs ORDER BY created_at DESC LIMIT 2
          UNION ALL
          SELECT 'proposal' as type, id, freelancer_id as user_id, created_at FROM proposals ORDER BY created_at DESC LIMIT 2
          UNION ALL
          SELECT 'transaction' as type, id, user_id, created_at FROM transactions WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
        ) AS actions
        LEFT JOIN users u ON actions.user_id = u.id
        LEFT JOIN jobs j ON actions.type = 'job' AND actions.id = j.id
        LEFT JOIN proposals p ON actions.type = 'proposal' AND actions.id = p.id
        LEFT JOIN transactions t ON actions.type = 'transaction' AND actions.id = t.id
        ORDER BY time DESC
        LIMIT 5
      `)
    ]);

    // Vaqtni formatlash (masalan "5 daqiqa oldin")
    const formatTime = (date) => {
      const diff = Math.floor((new Date() - new Date(date)) / 1000);
      if (diff < 60) return `${diff} soniya oldin`;
      if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
      return `${Math.floor(diff / 86400)} kun oldin`;
    };

    const formattedRecentActivity = recentActivity.rows.map(row => ({
      name: row.name,
      action: row.action,
      time: formatTime(row.time)
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: parseInt(usersCount.rows[0].count),
          totalFreelancers: parseInt(freelancersCount.rows[0].count),
          totalClients: parseInt(clientsCount.rows[0].count),
          activeJobs: parseInt(activeJobs.rows[0].count),
          totalRevenue: `${parseInt(totalRevenue.rows[0].total_fee).toLocaleString()} so‘m`,
          platformFee: `${parseInt(totalRevenue.rows[0].total_fee).toLocaleString()} so‘m`,
          usersGrowth: "+12.5%", // keyin real hisoblab qo‘shiladi
          jobsGrowth: "+8.3%",
          revenueGrowth: "+23.1%",
          feeGrowth: "+18.7%",
        },
        recentActivity: formattedRecentActivity.length > 0 ? formattedRecentActivity : [
          { name: "Ogabek Dev", action: "Yangi loyiha joylashtirdi", time: "5 daqiqa oldin" }
        ],
        quickStats: {
          pendingMilestones: parseInt(pendingMilestones.rows[0].count),
          completedThisMonth: parseInt(completedThisMonth.rows[0].count),
          openDisputes: parseInt(openDisputes.rows[0].count),
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats xatosi:', error.message);
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