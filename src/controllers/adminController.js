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
      openDisputes
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['freelancer']),
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['client']),
      pool.query('SELECT COUNT(*) FROM jobs WHERE status IN ($1, $2)', ['open', 'in_progress']),
      pool.query('SELECT COALESCE(SUM(amount), 0) as total_fee FROM transactions WHERE type = $1 AND status = $2', ['platform_fee', 'completed']), // alias qo'shildi: as total_fee
      pool.query('SELECT COUNT(*) FROM disputes WHERE status = $1', ['open'])
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: parseInt(usersCount.rows[0].count),
          totalFreelancers: parseInt(freelancersCount.rows[0].count),
          totalClients: parseInt(clientsCount.rows[0].count),
          activeJobs: parseInt(activeJobs.rows[0].count),
          totalRevenue: `${parseInt(totalRevenue.rows[0].total_fee).toLocaleString()} so‘m`, // total_fee deb o'zgartirildi
          platformFee: `${parseInt(totalRevenue.rows[0].total_fee).toLocaleString()} so‘m`,
          usersGrowth: "+12.5%",
          jobsGrowth: "+8.3%",
          revenueGrowth: "+23.1%",
          feeGrowth: "+18.7%",
        },
        recentActivity: [
          { name: "Ogabek Dev", action: "Yangi loyiha joylashtirdi", time: "5 daqiqa oldin" },
          { name: "Ali Pro", action: "Taklif yubordi", time: "12 daqiqa oldin" },
          { name: "Kamola Client", action: "To'lov amalga oshirdi", time: "25 daqiqa oldin" },
        ],
        quickStats: {
          pendingMilestones: 24,
          completedThisMonth: 67,
          openDisputes: parseInt(openDisputes.rows[0].count),
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats xatosi:', error.message); // xato aniq log bo‘ladi
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