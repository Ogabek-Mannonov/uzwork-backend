// src/controllers/freelancerController.js
const pool = require('../db/pool');

/**
 * GET /freelancers
 * Get all freelancers with filters
 */
const getFreelancers = async (req, res) => {
  try {
    const {
      skills,
      min_rating,
      location,
      availability,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    let whereConditions = ['u.role = $1'];
    let queryParams = ['freelancer'];
    let paramIndex = 2;

    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : [skills];
      whereConditions.push(`up.skills && $${paramIndex}`);
      queryParams.push(skillArray);
      paramIndex++;
    }

    if (location) {
      whereConditions.push(`up.location ILIKE $${paramIndex}`);
      queryParams.push(`%${location}%`);
      paramIndex++;
    }

    if (availability) {
      whereConditions.push(`up.availability = $${paramIndex}`);
      queryParams.push(availability);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get average rating subquery
    const ratingSubquery = `
      (SELECT AVG(rating)::numeric(10,2) 
       FROM reviews 
       WHERE reviewee_id = u.id) as average_rating,
      (SELECT COUNT(*) 
       FROM reviews 
       WHERE reviewee_id = u.id) as total_reviews
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id)
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Apply rating filter after getting results (for performance)
    let havingClause = '';
    if (min_rating) {
      havingClause = `HAVING average_rating >= ${parseFloat(min_rating)}`;
    }

    // Get freelancers
    const freelancersQuery = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_kyc_verified,
        up.bio,
        up.avatar_url,
        up.location,
        up.hourly_rate,
        up.skills,
        up.availability,
        ${ratingSubquery}
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClause}
      GROUP BY u.id, up.id
      ${havingClause}
      ORDER BY average_rating DESC NULLS LAST, u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const freelancersResult = await pool.query(freelancersQuery, queryParams);

    res.json({
      success: true,
      data: {
        freelancers: freelancersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get freelancers error:', error);
    res.status(500).json({
      success: false,
      message: 'Freelancerlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /freelancers/recommended
 * Get recommended freelancers for a project (AI-based)
 */
const getRecommendedFreelancers = async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: 'Project_id kerak.'
      });
    }

    // Get project details
    const projectResult = await pool.query(
      'SELECT skills, category, budget_type, experience_level FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    const project = projectResult.rows[0];

    // Simple matching algorithm (can be enhanced with AI)
    // Match by skills, experience level, and rating
    const freelancersQuery = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        up.bio,
        up.avatar_url,
        up.location,
        up.hourly_rate,
        up.skills,
        (SELECT AVG(rating)::numeric(10,2) FROM reviews WHERE reviewee_id = u.id) as average_rating,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews,
        (SELECT COUNT(*) FROM contracts WHERE freelancer_id = u.id AND status = 'completed') as completed_projects
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.role = 'freelancer'
        AND up.availability = 'available'
        AND ($1::text[] IS NULL OR up.skills && $1::text[])
      ORDER BY 
        average_rating DESC NULLS LAST,
        completed_projects DESC,
        u.created_at DESC
      LIMIT 5
    `;

    const result = await pool.query(freelancersQuery, [project.skills || null]);

    res.json({
      success: true,
      message: 'Tavsiya etilgan freelancerlar',
      data: {
        freelancers: result.rows
      }
    });
  } catch (error) {
    console.error('Get recommended freelancers error:', error);
    res.status(500).json({
      success: false,
      message: 'Tavsiya etilgan freelancerlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /freelancers/:id
 * Get freelancer profile by ID
 */
const getFreelancerById = async (req, res) => {
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
        (SELECT COUNT(*) FROM contracts WHERE freelancer_id = u.id AND status = 'completed') as completed_projects,
        (SELECT COUNT(*) FROM contracts WHERE freelancer_id = u.id) as total_projects
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1 AND u.role = 'freelancer'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Freelancer topilmadi.'
      });
    }

    res.json({
      success: true,
      data: {
        freelancer: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get freelancer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Freelancerni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /freelancers/premium
 * Activate premium subscription (200,000 UZS/month)
 */
const activatePremium = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancerlar premium obuna olishi mumkin.'
      });
    }

    // TODO: Check payment/balance (200,000 UZS/month)
    // TODO: Add premium_expires_at field to user_profiles table
    // For now, just return success

    res.json({
      success: true,
      message: 'Premium obuna faollashtirildi! (200 000 so\'m/oy)'
    });
  } catch (error) {
    console.error('Activate premium error:', error);
    res.status(500).json({
      success: false,
      message: 'Premium obunani faollashtirishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /freelancers/me/ai-portfolio
 * AI portfolio generation
 */
const aiPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skills, experience } = req.body;

    // TODO: Integrate with AI service
    const portfolio = {
      bio: `Experienced ${skills?.join(', ') || 'developer'} with ${experience || 'extensive'} experience.`,
      portfolio_items: []
    };

    res.json({
      success: true,
      data: {
        portfolio
      }
    });
  } catch (error) {
    console.error('AI portfolio error:', error);
    res.status(500).json({
      success: false,
      message: 'Portfolio yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /freelancers/saved
 * Get saved freelancers (client)
 */
const getSavedFreelancers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        up.bio,
        up.avatar_url,
        up.location,
        up.skills,
        (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as average_rating
      FROM saved_items s
      JOIN users u ON s.item_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE s.user_id = $1 AND s.item_type = 'freelancer' AND u.role = 'freelancer'
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        freelancers: result.rows
      }
    });
  } catch (error) {
    console.error('Get saved freelancers error:', error);
    res.status(500).json({
      success: false,
      message: 'Saqlangan freelancerlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /freelancers/:id/save
 * Save freelancer
 */
const saveFreelancer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already saved
    const existing = await pool.query(
      'SELECT id FROM saved_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, 'freelancer', id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Freelancer allaqachon saqlangan.'
      });
    }

    await pool.query(
      'INSERT INTO saved_items (user_id, item_type, item_id) VALUES ($1, $2, $3)',
      [userId, 'freelancer', id]
    );

    res.json({
      success: true,
      message: 'Freelancer saqlandi!'
    });
  } catch (error) {
    console.error('Save freelancer error:', error);
    res.status(500).json({
      success: false,
      message: 'Saqlashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  getFreelancers,
  getRecommendedFreelancers,
  getFreelancerById,
  activatePremium,
  aiPortfolio,
  getSavedFreelancers,
  saveFreelancer
};

