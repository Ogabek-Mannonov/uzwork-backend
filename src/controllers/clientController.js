// src/controllers/clientController.js
const pool = require('../db/pool');

/**
 * GET /clients
 * Get all clients with filters
 */
const getClients = async (req, res) => {
  try {
    const {
      company_name,
      min_rating,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    let whereConditions = ['u.role = $1'];
    let queryParams = ['client'];
    let paramIndex = 2;

    // Note: company_name would be in user_profiles or separate table
    // For now, we'll search in user_profiles.bio or create company field later

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id)
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get clients with rating
    const clientsQuery = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_kyc_verified,
        up.bio,
        up.avatar_url,
        up.location,
        (SELECT AVG(rating)::numeric(10,2) FROM reviews WHERE reviewee_id = u.id) as average_rating,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews,
        (SELECT COUNT(*) FROM projects WHERE client_id = u.id) as total_projects,
        (SELECT COUNT(*) FROM contracts WHERE client_id = u.id AND status = 'completed') as completed_projects
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClause}
      GROUP BY u.id, up.id
      ORDER BY average_rating DESC NULLS LAST, u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const clientsResult = await pool.query(clientsQuery, queryParams);

    res.json({
      success: true,
      data: {
        clients: clientsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Clientlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /clients/:id
 * Get client profile by ID
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_kyc_verified,
        up.*,
        (SELECT AVG(rating)::numeric(10,2) FROM reviews WHERE reviewee_id = u.id) as average_rating,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews,
        (SELECT COUNT(*) FROM projects WHERE client_id = u.id) as total_projects,
        (SELECT COUNT(*) FROM contracts WHERE client_id = u.id AND status = 'completed') as completed_projects
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1 AND u.role = 'client'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client topilmadi.'
      });
    }

    res.json({
      success: true,
      data: {
        client: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get client by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Clientni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /clients/me
 * Update own client profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar profilni yangilashi mumkin.'
      });
    }

    const { bio, location, team_members } = req.body;

    // Update user_profile
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramIndex++}`);
      updateValues.push(bio);
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(location);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Yangilanish uchun hech bo\'lmaganda bitta maydon kerak.'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId);

    await pool.query(
      `UPDATE user_profiles 
       SET ${updateFields.join(', ')}
       WHERE user_id = $${paramIndex}`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Profil yangilandi!'
    });
  } catch (error) {
    console.error('Update client profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profilni yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  getClients,
  getClientById,
  updateMyProfile
};

