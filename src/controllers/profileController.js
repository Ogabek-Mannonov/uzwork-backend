// src/controllers/profileController.js
const pool = require('../db/pool');

/**
 * GET /profiles/me
 * Get current user's profile
 */
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const profileResult = await pool.query(
      `SELECT 
        up.*,
        u.email,
        u.phone,
        u.first_name,
        u.last_name,
        u.role,
        u.is_email_verified,
        u.is_phone_verified,
        u.is_kyc_verified,
        u.kyc_status
      FROM user_profiles up
      RIGHT JOIN users u ON up.user_id = u.id
      WHERE u.id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    // Get average rating if freelancer
    let averageRating = null;
    if (req.user.role === 'freelancer') {
      const ratingResult = await pool.query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
         FROM reviews
         WHERE reviewee_id = $1`,
        [userId]
      );
      if (ratingResult.rows[0].total_reviews > 0) {
        averageRating = parseFloat(ratingResult.rows[0].avg_rating).toFixed(2);
      }
    }

    res.json({
      success: true,
      data: {
        profile: {
          ...profileResult.rows[0],
          average_rating: averageRating
        }
      }
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profilni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /profiles/:userId
 * Get user profile by ID
 */
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user profile
    const profileResult = await pool.query(
      `SELECT 
        up.*,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_kyc_verified
      FROM user_profiles up
      RIGHT JOIN users u ON up.user_id = u.id
      WHERE u.id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    // Get average rating if freelancer
    let averageRating = null;
    let totalReviews = 0;
    if (profileResult.rows[0].role === 'freelancer') {
      const ratingResult = await pool.query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
         FROM reviews
         WHERE reviewee_id = $1`,
        [userId]
      );
      totalReviews = parseInt(ratingResult.rows[0].total_reviews);
      if (totalReviews > 0) {
        averageRating = parseFloat(ratingResult.rows[0].avg_rating).toFixed(2);
      }
    }

    res.json({
      success: true,
      data: {
        profile: {
          ...profileResult.rows[0],
          average_rating: averageRating,
          total_reviews: totalReviews
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profilni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /profiles/me
 * Update current user's profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bio,
      avatar_url,
      location,
      hourly_rate,
      skills,
      portfolio_urls,
      languages,
      education,
      work_experience,
      certifications,
      availability
    } = req.body;

    // Check if profile exists
    const profileCheck = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileCheck.rows.length === 0) {
      // Create profile
      const result = await pool.query(
        `INSERT INTO user_profiles (
          user_id, bio, avatar_url, location, hourly_rate, skills,
          portfolio_urls, languages, education, work_experience,
          certifications, availability
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          userId,
          bio || null,
          avatar_url || null,
          location || null,
          hourly_rate || null,
          skills || [],
          portfolio_urls || [],
          languages ? JSON.stringify(languages) : null,
          education ? JSON.stringify(education) : null,
          work_experience ? JSON.stringify(work_experience) : null,
          certifications ? JSON.stringify(certifications) : null,
          availability || 'available'
        ]
      );

      return res.json({
        success: true,
        message: 'Profil muvaffaqiyatli yaratildi!',
        data: {
          profile: result.rows[0]
        }
      });
    }

    // Update existing profile
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramIndex++}`);
      updateValues.push(bio);
    }
    if (avatar_url !== undefined) {
      updateFields.push(`avatar_url = $${paramIndex++}`);
      updateValues.push(avatar_url);
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(location);
    }
    if (hourly_rate !== undefined) {
      updateFields.push(`hourly_rate = $${paramIndex++}`);
      updateValues.push(hourly_rate);
    }
    if (skills !== undefined) {
      updateFields.push(`skills = $${paramIndex++}`);
      updateValues.push(skills);
    }
    if (portfolio_urls !== undefined) {
      updateFields.push(`portfolio_urls = $${paramIndex++}`);
      updateValues.push(portfolio_urls);
    }
    if (languages !== undefined) {
      updateFields.push(`languages = $${paramIndex++}`);
      updateValues.push(JSON.stringify(languages));
    }
    if (education !== undefined) {
      updateFields.push(`education = $${paramIndex++}`);
      updateValues.push(JSON.stringify(education));
    }
    if (work_experience !== undefined) {
      updateFields.push(`work_experience = $${paramIndex++}`);
      updateValues.push(JSON.stringify(work_experience));
    }
    if (certifications !== undefined) {
      updateFields.push(`certifications = $${paramIndex++}`);
      updateValues.push(JSON.stringify(certifications));
    }
    if (availability !== undefined) {
      updateFields.push(`availability = $${paramIndex++}`);
      updateValues.push(availability);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Yangilanish uchun hech bo\'lmaganda bitta maydon kerak.'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(userId);

    const updateQuery = `
      UPDATE user_profiles 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Profil muvaffaqiyatli yangilandi!',
      data: {
        profile: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profilni yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  getMyProfile,
  getUserProfile,
  updateMyProfile
};



