// src/controllers/reviewController.js
const pool = require('../db/pool');
const { createNotification } = require('./notificationController');

/**
 * POST /reviews
 * Create a review for completed contract
 */
const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contract_id, rating, comment } = req.body;

    if (!contract_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Contract_id va rating majburiy maydonlar.'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating 1 dan 5 gacha bo\'lishi kerak.'
      });
    }

    // Get contract
    const contractResult = await pool.query(
      'SELECT client_id, freelancer_id, status FROM contracts WHERE id = $1',
      [contract_id]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shartnoma topilmadi.'
      });
    }

    const contract = contractResult.rows[0];

    // Check if user is part of contract
    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu shartnomaning qismi emassiz.'
      });
    }

    // Check if contract is completed
    if (contract.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "completed" statusdagi shartnomalar uchun sharh yozish mumkin.'
      });
    }

    // Determine reviewee (the other party)
    const revieweeId = contract.client_id === userId 
      ? contract.freelancer_id 
      : contract.client_id;

    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE contract_id = $1 AND reviewer_id = $2',
      [contract_id, userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Siz bu shartnoma uchun allaqachon sharh yozgansiz.'
      });
    }

    // Create review
    const result = await pool.query(
      `INSERT INTO reviews (contract_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [contract_id, userId, revieweeId, rating, comment || null]
    );

    const reviewerRes = await pool.query(`SELECT first_name, last_name FROM users WHERE id = $1`, [userId]);
    const reviewerName = reviewerRes.rows[0] ? `${reviewerRes.rows[0].first_name || ''} ${reviewerRes.rows[0].last_name || ''}`.trim() : 'Foydalanuvchi';

    // ✅ Notify reviewee
    const io = req.app.get("io");
    createNotification(io, {
      userId: revieweeId,
      type: 'new_review',
      title: 'Yangi sharh!',
      message: `Sizga yangi sharh qoldirildi: "${(comment || '').substring(0, 50)}${(comment || '').length > 50 ? '...' : ''}"`,
      relatedId: result.rows[0].id,
      relatedType: 'review',
      translationData: { reviewerName }
    });

    res.status(201).json({
      success: true,
      message: 'Sharh muvaffaqiyatli yozildi!',
      data: {
        review: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Sharh yozishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /reviews
 * Get all reviews with filters
 */
const getReviews = async (req, res) => {
  try {
    const {
      reviewee_id,
      freelancer_id, // Alias for reviewee_id
      reviewer_id,
      contract_id,
      min_rating,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    const targetRevieweeId = reviewee_id || freelancer_id;

    if (targetRevieweeId) {
      whereConditions.push(`r.reviewee_id = $${paramIndex++}`);
      queryParams.push(targetRevieweeId);
    }

    if (reviewer_id) {
      whereConditions.push(`r.reviewer_id = $${paramIndex++}`);
      queryParams.push(reviewer_id);
    }

    if (contract_id) {
      whereConditions.push(`r.contract_id = $${paramIndex++}`);
      queryParams.push(contract_id);
    }

    if (min_rating) {
      whereConditions.push(`r.rating >= $${paramIndex++}`);
      queryParams.push(parseInt(min_rating));
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM reviews r ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get reviews with user info and job info
    const reviewsQuery = `
      SELECT 
        r.*,
        u_reviewer.first_name as reviewer_first_name,
        u_reviewer.last_name as reviewer_last_name,
        u_reviewee.first_name as reviewee_first_name,
        u_reviewee.last_name as reviewee_last_name,
        j.title as job_title,
        c.total_amount as project_amount,
        c.currency as project_currency
      FROM reviews r
      JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      JOIN users u_reviewee ON r.reviewee_id = u_reviewee.id
      LEFT JOIN contracts c ON r.contract_id = c.id
      LEFT JOIN jobs j ON c.job_id = j.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const reviewsResult = await pool.query(reviewsQuery, queryParams);

    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Sharhlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /reviews/:id
 * Get review by ID
 */
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        r.*,
        u_reviewer.first_name as reviewer_first_name,
        u_reviewer.last_name as reviewer_last_name,
        u_reviewee.first_name as reviewee_first_name,
        u_reviewee.last_name as reviewee_last_name
      FROM reviews r
      JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      JOIN users u_reviewee ON r.reviewee_id = u_reviewee.id
      WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sharh topilmadi.'
      });
    }

    res.json({
      success: true,
      data: {
        review: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get review by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Sharhni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /reviews/user/:userId
 * Get reviews for a specific user (with average rating)
 */
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get reviews with reviewer info and job info
    const reviewsQuery = `
      SELECT 
        r.*,
        u_reviewer.first_name as reviewer_first_name,
        u_reviewer.last_name as reviewer_last_name,
        j.title as job_title,
        c.total_amount as project_amount,
        c.currency as project_currency
      FROM reviews r
      JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      LEFT JOIN contracts c ON r.contract_id = c.id
      LEFT JOIN jobs j ON c.job_id = j.id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const reviewsResult = await pool.query(reviewsQuery, [userId, parseInt(limit), offset]);

    // Get average rating and total count
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE reviewee_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        stats: {
          total_reviews: parseInt(stats.total_reviews),
          average_rating: parseFloat(stats.average_rating || 0).toFixed(2),
          rating_distribution: {
            five_star: parseInt(stats.five_star),
            four_star: parseInt(stats.four_star),
            three_star: parseInt(stats.three_star),
            two_star: parseInt(stats.two_star),
            one_star: parseInt(stats.one_star)
          }
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(stats.total_reviews),
          totalPages: Math.ceil(parseInt(stats.total_reviews) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Sharhlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /reviews/:id
 * Update review (only author can update)
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if review exists and user is author
    const reviewCheck = await pool.query(
      'SELECT reviewer_id FROM reviews WHERE id = $1',
      [id]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sharh topilmadi.'
      });
    }

    if (reviewCheck.rows[0].reviewer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu sharhning muallifi emassiz.'
      });
    }

    const { rating, comment } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating 1 dan 5 gacha bo\'lishi kerak.'
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (rating !== undefined) {
      updateFields.push(`rating = $${paramIndex++}`);
      updateValues.push(rating);
    }
    if (comment !== undefined) {
      updateFields.push(`comment = $${paramIndex++}`);
      updateValues.push(comment);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Yangilanish uchun hech bo\'lmaganda bitta maydon kerak.'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE reviews 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Sharh muvaffaqiyatli yangilandi!',
      data: {
        review: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Sharhni yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  getUserReviews,
  updateReview
};



