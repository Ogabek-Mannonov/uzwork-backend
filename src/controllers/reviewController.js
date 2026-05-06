// src/controllers/reviewController.js
const pool = require('../db/pool');
const { createNotification } = require('./notificationController');

/**
 * Calculates the Exponential Decay Rating
 * Last 3 months reviews get 70% weight, older ones 30% weight.
 */
const calculateWeightedRating = (ratingsRows, role) => {
  if (ratingsRows.length === 0) return 0;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentScores = [];
  const oldScores = [];

  for (const row of ratingsRows) {
    let score = 0;
    const createdAtDate = new Date(row.created_at);

    if (role === 'freelancer') {
      const q = row.score_quality || 0;
      const t = row.score_timeliness || 0;
      const c = row.score_communication || 0;
      const count = (row.score_quality ? 1 : 0) + (row.score_timeliness ? 1 : 0) + (row.score_communication ? 1 : 0);
      score = count > 0 ? (q + t + c) / count : 0;
    } else {
      // Client
      const p = row.score_payment || 0;
      const cl = row.score_clarity || 0;
      const count = (row.score_payment ? 1 : 0) + (row.score_clarity ? 1 : 0);
      score = count > 0 ? (p + cl) / count : 0;
    }

    if (createdAtDate >= threeMonthsAgo) {
      recentScores.push(score);
    } else {
      oldScores.push(score);
    }
  }

  let finalRating = 0;
  if (recentScores.length > 0 && oldScores.length > 0) {
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const avgOld = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
    finalRating = (avgRecent * 0.7) + (avgOld * 0.3);
  } else if (recentScores.length > 0) {
    finalRating = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  } else if (oldScores.length > 0) {
    finalRating = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
  }

  return parseFloat(finalRating.toFixed(2));
};

/**
 * Updates a user's rating profile in the DB
 */
const updateUserRating = async (userId) => {
  try {
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return;
    const role = userResult.rows[0].role;

    const ratingsResult = await pool.query(
      'SELECT score_quality, score_timeliness, score_communication, score_payment, score_clarity, created_at FROM ratings WHERE to_user_id = $1',
      [userId]
    );

    const finalRating = calculateWeightedRating(ratingsResult.rows, role);

    if (role === 'freelancer') {
      await pool.query('UPDATE freelancer_profiles SET rating = $1 WHERE user_id = $2', [finalRating, userId]);
    } else if (role === 'client') {
      await pool.query('UPDATE client_profiles SET rating = $1 WHERE user_id = $2', [finalRating, userId]);
    }
  } catch (error) {
    console.error(`Error updating rating for user ${userId}:`, error.message);
  }
};

/**
 * POST /reviews
 * Create a review/rating for completed contract
 */
const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      contract_id, 
      score_quality, 
      score_timeliness, 
      score_communication, 
      score_payment, 
      score_clarity, 
      rating, 
      comment 
    } = req.body;

    if (!contract_id) {
      return res.status(400).json({
        success: false,
        message: 'Contract_id majburiy maydon.'
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
        message: 'Faqat "completed" statusdagi shartnomalar uchun baho berish mumkin.'
      });
    }

    // Determine reviewee (the other party)
    const revieweeId = contract.client_id === userId 
      ? contract.freelancer_id 
      : contract.client_id;

    // Check reviewee role
    const revieweeUserRes = await pool.query('SELECT role FROM users WHERE id = $1', [revieweeId]);
    if (revieweeUserRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi.' });
    }
    const revieweeRole = revieweeUserRes.rows[0].role;

    // --- SECURITY & ANTI-ABUSE ---
    // A user can only rate the same user 2 times within 1 month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const antiAbuseCount = await pool.query(
      'SELECT COUNT(*) FROM ratings WHERE from_user_id = $1 AND to_user_id = $2 AND created_at >= $3',
      [userId, revieweeId, oneMonthAgo]
    );
    if (parseInt(antiAbuseCount.rows[0].count) >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Siz ushbu foydalanuvchiga 1 oy ichida ko\'pi bilan 2 marta reyting bera olasiz.'
      });
    }

    // Check if review already exists from this reviewer for this contract
    const existingReview = await pool.query(
      'SELECT id FROM ratings WHERE contract_id = $1 AND from_user_id = $2',
      [contract_id, userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Siz bu shartnoma uchun allaqachon baho bergansiz.'
      });
    }

    // --- PARAMETERS MAPPING & VALIDATION ---
    let sq = null, st = null, sc = null, sp = null, s_clarity = null;

    if (revieweeRole === 'freelancer') {
      // Client is rating Freelancer
      sq = score_quality !== undefined ? score_quality : rating;
      st = score_timeliness !== undefined ? score_timeliness : rating;
      sc = score_communication !== undefined ? score_communication : rating;

      if (!sq || !st || !sc) {
        return res.status(400).json({
          success: false,
          message: 'Frilanser uchun barcha baholash metrikalari majburiy (Sifat, Muddat, Muloqot).'
        });
      }

      if (sq < 1 || sq > 5 || st < 1 || st > 5 || sc < 1 || sc > 5) {
        return res.status(400).json({
          success: false,
          message: 'Barcha baholar 1 dan 5 gacha bo\'lishi kerak.'
        });
      }
    } else {
      // Freelancer is rating Client
      sp = score_payment !== undefined ? score_payment : rating;
      s_clarity = score_clarity !== undefined ? score_clarity : rating;

      if (!sp || !s_clarity) {
        return res.status(400).json({
          success: false,
          message: 'Buyurtmachi uchun barcha baholash metrikalari majburiy (To\'lov, Texnik topshiriq aniqligi).'
        });
      }

      if (sp < 1 || sp > 5 || s_clarity < 1 || s_clarity > 5) {
        return res.status(400).json({
          success: false,
          message: 'Barcha baholar 1 dan 5 gacha bo\'lishi kerak.'
        });
      }
    }

    // Create rating
    const result = await pool.query(
      `INSERT INTO ratings (
        contract_id, from_user_id, to_user_id, 
        score_quality, score_timeliness, score_communication,
        score_payment, score_clarity,
        comment, is_automatic
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
       RETURNING *`,
      [contract_id, userId, revieweeId, sq, st, sc, sp, s_clarity, comment || null]
    );

    // Recalculate reviewee's overall rating in their profile
    await updateUserRating(revieweeId);

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
      message: 'Baho muvaffaqiyatli qabul qilindi!',
      data: {
        review: {
          ...result.rows[0],
          reviewer_id: result.rows[0].from_user_id,
          reviewee_id: result.rows[0].to_user_id,
          rating: rating || (revieweeRole === 'freelancer' ? (sq + st + sc) / 3 : (sp + s_clarity) / 2)
        }
      }
    });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Baho yozishda xato yuz berdi.',
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
      whereConditions.push(`r.to_user_id = $${paramIndex++}`);
      queryParams.push(targetRevieweeId);
    }

    if (reviewer_id) {
      whereConditions.push(`r.from_user_id = $${paramIndex++}`);
      queryParams.push(reviewer_id);
    }

    if (contract_id) {
      whereConditions.push(`r.contract_id = $${paramIndex++}`);
      queryParams.push(contract_id);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ratings r ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get ratings with aliased legacy fields for frontend compatibility
    const reviewsQuery = `
      SELECT 
        r.*,
        r.from_user_id as reviewer_id,
        r.to_user_id as reviewee_id,
        COALESCE(
          (r.score_quality + r.score_timeliness + r.score_communication) / 3.0,
          (r.score_payment + r.score_clarity) / 2.0
        ) as rating,
        u_reviewer.first_name as reviewer_first_name,
        u_reviewer.last_name as reviewer_last_name,
        u_reviewee.first_name as reviewee_first_name,
        u_reviewee.last_name as reviewee_last_name,
        j.title as job_title,
        c.total_amount as project_amount,
        c.currency as project_currency
      FROM ratings r
      JOIN users u_reviewer ON r.from_user_id = u_reviewer.id
      JOIN users u_reviewee ON r.to_user_id = u_reviewee.id
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
        r.from_user_id as reviewer_id,
        r.to_user_id as reviewee_id,
        COALESCE(
          (r.score_quality + r.score_timeliness + r.score_communication) / 3.0,
          (r.score_payment + r.score_clarity) / 2.0
        ) as rating,
        u_reviewer.first_name as reviewer_first_name,
        u_reviewer.last_name as reviewer_last_name,
        u_reviewee.first_name as reviewee_first_name,
        u_reviewee.last_name as reviewee_last_name
      FROM ratings r
      JOIN users u_reviewer ON r.from_user_id = u_reviewer.id
      JOIN users u_reviewee ON r.to_user_id = u_reviewee.id
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
 * Get reviews for a specific user (with sub-metrics and star distribution)
 */
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check user and get their role
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }
    const role = userResult.rows[0].role;

    // Get reviews with reviewer info and job info
    const reviewsQuery = `
      SELECT 
        r.*,
        r.from_user_id as reviewer_id,
        r.to_user_id as reviewee_id,
        COALESCE(
          (r.score_quality + r.score_timeliness + r.score_communication) / 3.0,
          (r.score_payment + r.score_clarity) / 2.0
        ) as rating,
        u_reviewer.first_name as reviewer_first_name,
        u_reviewer.last_name as reviewer_last_name,
        j.title as job_title,
        c.total_amount as project_amount,
        c.currency as project_currency
      FROM ratings r
      JOIN users u_reviewer ON r.from_user_id = u_reviewer.id
      LEFT JOIN contracts c ON r.contract_id = c.id
      LEFT JOIN jobs j ON c.job_id = j.id
      WHERE r.to_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const reviewsResult = await pool.query(reviewsQuery, [userId, parseInt(limit), offset]);

    // Fetch all ratings to calculate exact premium metrics & decay rating
    const allRatingsRes = await pool.query(
      `SELECT 
        score_quality, score_timeliness, score_communication,
        score_payment, score_clarity, created_at,
        COALESCE(
          (score_quality + score_timeliness + score_communication) / 3.0,
          (score_payment + score_clarity) / 2.0
        ) as calculated_rating
       FROM ratings
       WHERE to_user_id = $1`,
      [userId]
    );

    const starDistribution = {
      five_star: 0,
      four_star: 0,
      three_star: 0,
      two_star: 0,
      one_star: 0
    };

    let sumQuality = 0, countQuality = 0;
    let sumTimeliness = 0, countTimeliness = 0;
    let sumCommunication = 0, countCommunication = 0;
    let sumPayment = 0, countPayment = 0;
    let sumClarity = 0, countClarity = 0;

    for (const r of allRatingsRes.rows) {
      const val = Math.round(parseFloat(r.calculated_rating || 0));
      if (val === 5) starDistribution.five_star++;
      else if (val === 4) starDistribution.four_star++;
      else if (val === 3) starDistribution.three_star++;
      else if (val === 2) starDistribution.two_star++;
      else if (val === 1) starDistribution.one_star++;

      if (r.score_quality) { sumQuality += r.score_quality; countQuality++; }
      if (r.score_timeliness) { sumTimeliness += r.score_timeliness; countTimeliness++; }
      if (r.score_communication) { sumCommunication += r.score_communication; countCommunication++; }
      if (r.score_payment) { sumPayment += r.score_payment; countPayment++; }
      if (r.score_clarity) { sumClarity += r.score_clarity; countClarity++; }
    }

    // Calculated Weighted average rating using Exponential Decay
    const averageRating = calculateWeightedRating(allRatingsRes.rows, role);

    const subMetrics = role === 'freelancer' ? {
      quality: countQuality > 0 ? parseFloat((sumQuality / countQuality).toFixed(2)) : 0,
      timeliness: countTimeliness > 0 ? parseFloat((sumTimeliness / countTimeliness).toFixed(2)) : 0,
      communication: countCommunication > 0 ? parseFloat((sumCommunication / countCommunication).toFixed(2)) : 0
    } : {
      payment: countPayment > 0 ? parseFloat((sumPayment / countPayment).toFixed(2)) : 0,
      clarity: countClarity > 0 ? parseFloat((sumClarity / countClarity).toFixed(2)) : 0
    };

    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        stats: {
          total_reviews: allRatingsRes.rows.length,
          average_rating: averageRating.toFixed(2),
          sub_metrics: subMetrics,
          rating_distribution: {
            five_star: starDistribution.five_star,
            four_star: starDistribution.four_star,
            three_star: starDistribution.three_star,
            two_star: starDistribution.two_star,
            one_star: starDistribution.one_star
          }
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allRatingsRes.rows.length,
          totalPages: Math.ceil(allRatingsRes.rows.length / parseInt(limit))
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
 * Update review (only author can update and only within 48 hours)
 */
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { 
      score_quality, 
      score_timeliness, 
      score_communication, 
      score_payment, 
      score_clarity, 
      rating, 
      comment 
    } = req.body;

    // Check if review exists and user is author
    const reviewCheck = await pool.query(
      'SELECT from_user_id, to_user_id, created_at FROM ratings WHERE id = $1',
      [id]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sharh topilmadi.'
      });
    }

    const ratingRow = reviewCheck.rows[0];
    if (ratingRow.from_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu sharhning muallifi emassiz.'
      });
    }

    // --- TIMING RESTRICTION ---
    // Editing only allowed within 48 hours of creation
    const createdAt = new Date(ratingRow.created_at);
    const hoursPassed = (new Date() - createdAt) / (1000 * 60 * 60);
    if (hoursPassed > 48) {
      return res.status(400).json({
        success: false,
        message: 'Baho berilgandan keyin faqat 48 soat ichida uni tahrirlashingiz mumkin.'
      });
    }

    // Check reviewee role
    const revieweeId = ratingRow.to_user_id;
    const revieweeUserRes = await pool.query('SELECT role FROM users WHERE id = $1', [revieweeId]);
    const revieweeRole = revieweeUserRes.rows[0]?.role;

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (revieweeRole === 'freelancer') {
      const sq = score_quality !== undefined ? score_quality : rating;
      const st = score_timeliness !== undefined ? score_timeliness : rating;
      const sc = score_communication !== undefined ? score_communication : rating;

      if (sq !== undefined) {
        updateFields.push(`score_quality = $${paramIndex++}`);
        updateValues.push(sq);
      }
      if (st !== undefined) {
        updateFields.push(`score_timeliness = $${paramIndex++}`);
        updateValues.push(st);
      }
      if (sc !== undefined) {
        updateFields.push(`score_communication = $${paramIndex++}`);
        updateValues.push(sc);
      }
    } else {
      // Client
      const sp = score_payment !== undefined ? score_payment : rating;
      const s_clarity = score_clarity !== undefined ? score_clarity : rating;

      if (sp !== undefined) {
        updateFields.push(`score_payment = $${paramIndex++}`);
        updateValues.push(sp);
      }
      if (s_clarity !== undefined) {
        updateFields.push(`score_clarity = $${paramIndex++}`);
        updateValues.push(s_clarity);
      }
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

    updateValues.push(id);
    const updateQuery = `
      UPDATE ratings 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    // Recalculate reviewee overall rating in profile
    await updateUserRating(revieweeId);

    res.json({
      success: true,
      message: 'Baho muvaffaqiyatli yangilandi!',
      data: {
        review: {
          ...result.rows[0],
          reviewer_id: result.rows[0].from_user_id,
          reviewee_id: result.rows[0].to_user_id
        }
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
  updateReview,
  updateUserRating
};
