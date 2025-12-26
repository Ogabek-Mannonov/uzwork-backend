// src/controllers/adminController.js
const pool = require('../db/pool');

/**
 * Middleware to check if user is admin
 */
const isAdmin = async (req, res, next) => {
  try {
    // TODO: Add admin role to users table
    // For now, check if user has admin email or add admin role
    const userId = req.user.id;
    
    // Simple check - in production, add 'admin' role to users table
    const userResult = await pool.query(
      'SELECT email, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].email.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Admin huquqi kerak.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /admin/users
 * Get all users (admin only)
 */
const getUsers = async (req, res) => {
  try {
    const { role, verified, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`role = $${paramIndex++}`);
      queryParams.push(role);
    }

    if (verified === 'true') {
      whereConditions.push(`is_kyc_verified = TRUE`);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get users
    const usersQuery = `
      SELECT 
        id, email, phone, role, first_name, last_name,
        is_email_verified, is_phone_verified, is_kyc_verified,
        kyc_status, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const usersResult = await pool.query(usersQuery, queryParams);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchilarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /admin/users/:id/verify
 * Verify user KYC (admin only)
 */
const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { kyc_status } = req.body;

    if (!['approved', 'rejected'].includes(kyc_status)) {
      return res.status(400).json({
        success: false,
        message: 'KYC status "approved" yoki "rejected" bo\'lishi kerak.'
      });
    }

    await pool.query(
      'UPDATE users SET kyc_status = $1, is_kyc_verified = $2 WHERE id = $3',
      [kyc_status, kyc_status === 'approved', id]
    );

    res.json({
      success: true,
      message: `Foydalanuvchi ${kyc_status === 'approved' ? 'tasdiqlandi' : 'rad etildi'}.`
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchini tasdiqlashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /admin/jobs
 * Get all projects (admin only)
 */
const getJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause = `WHERE status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM projects ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get projects
    const projectsQuery = `
      SELECT 
        p.*,
        u.email as client_email,
        u.first_name as client_first_name,
        u.last_name as client_last_name
      FROM projects p
      JOIN users u ON p.client_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const projectsResult = await pool.query(projectsQuery, queryParams);

    res.json({
      success: true,
      data: {
        projects: projectsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /admin/disputes
 * Get all disputes (admin only)
 */
const getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause = `WHERE d.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM disputes d ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get disputes
    const disputesQuery = `
      SELECT 
        d.*,
        c.project_id,
        u_initiator.first_name as initiator_first_name,
        u_initiator.last_name as initiator_last_name
      FROM disputes d
      JOIN contracts c ON d.contract_id = c.id
      JOIN users u_initiator ON d.initiator_id = u_initiator.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const disputesResult = await pool.query(disputesQuery, queryParams);

    res.json({
      success: true,
      data: {
        disputes: disputesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({
      success: false,
      message: 'Nizolarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /admin/disputes/:id/resolve
 * Resolve dispute (admin only)
 */
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution matni kerak.'
      });
    }

    await pool.query(
      'UPDATE disputes SET status = $1, resolution = $2, resolved_by = $3, resolved_at = CURRENT_TIMESTAMP WHERE id = $4',
      ['resolved', resolution, adminId, id]
    );

    res.json({
      success: true,
      message: 'Nizo hal qilindi.'
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Nizoni hal qilishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /admin/analytics
 * Get platform analytics (admin only)
 */
const getAnalytics = async (req, res) => {
  try {
    // Get statistics
    const [
      usersCount,
      projectsCount,
      contractsCount,
      revenueResult,
      freelancersCount,
      clientsCount
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM projects'),
      pool.query('SELECT COUNT(*) as count FROM contracts WHERE status = $1', ['completed']),
      pool.query('SELECT SUM(amount) as total FROM payments WHERE payment_type = $1 AND status = $2', ['deposit', 'completed']),
      pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['freelancer']),
      pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['client'])
    ]);

    res.json({
      success: true,
      data: {
        analytics: {
          total_users: parseInt(usersCount.rows[0].count),
          total_freelancers: parseInt(freelancersCount.rows[0].count),
          total_clients: parseInt(clientsCount.rows[0].count),
          total_projects: parseInt(projectsCount.rows[0].count),
          completed_contracts: parseInt(contractsCount.rows[0].count),
          total_revenue: parseFloat(revenueResult.rows[0].total || 0)
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  isAdmin,
  getUsers,
  verifyUser,
  getJobs,
  getDisputes,
  resolveDispute,
  getAnalytics
};


