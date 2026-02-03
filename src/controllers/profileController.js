// src/controllers/profileController.js
const pool = require("../db/pool");

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // user asosiy info
    const userRes = await pool.query(
      `SELECT id, email, phone, first_name, last_name, role,
              is_email_verified, is_phone_verified, is_kyc_verified, kyc_status
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi." });
    }

    const user = userRes.rows[0];

    let roleProfile = null;

    if (user.role === "freelancer") {
      const fp = await pool.query(
        `SELECT user_id, title, bio, hourly_rate, location, languages, skills, portfolio_urls,
                rating, completed_jobs, avatar_url, cover_url, availability_status,
                created_at, updated_at
         FROM freelancer_profiles
         WHERE user_id = $1`,
        [userId]
      );
      roleProfile = fp.rows[0] || null;
    } else if (user.role === "client") {
      const cp = await pool.query(
        `SELECT user_id, company_name, company_website, company_size, rating, spent_total,
                created_at, updated_at
         FROM client_profiles
         WHERE user_id = $1`,
        [userId]
      );
      roleProfile = cp.rows[0] || null;
    }

    // freelancer bo‘lsa review average
    let averageRating = null;
    let totalReviews = 0;

    if (user.role === "freelancer") {
      const r = await pool.query(
        `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_reviews
         FROM reviews
         WHERE reviewee_id = $1`,
        [userId]
      );
      totalReviews = parseInt(r.rows[0].total_reviews, 10);
      if (totalReviews > 0) averageRating = Number(r.rows[0].avg_rating).toFixed(2);
    }

    return res.json({
      success: true,
      data: {
        user,
        profile: roleProfile,
        average_rating: averageRating,
        total_reviews: totalReviews
      }
    });
  } catch (error) {
    console.error("Get my profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Profilni olishda xato yuz berdi.",
      error: error.message
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const userRes = await pool.query(
      `SELECT id, email, first_name, last_name, role, is_kyc_verified
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi." });
    }

    const user = userRes.rows[0];
    let roleProfile = null;

    if (user.role === "freelancer") {
      const fp = await pool.query(
        `SELECT user_id, title, bio, hourly_rate, location, languages, skills, portfolio_urls,
                rating, completed_jobs, avatar_url, cover_url, availability_status,
                created_at, updated_at
         FROM freelancer_profiles
         WHERE user_id = $1`,
        [userId]
      );
      roleProfile = fp.rows[0] || null;
    } else if (user.role === "client") {
      const cp = await pool.query(
        `SELECT user_id, company_name, company_website, company_size, rating, spent_total,
                created_at, updated_at
         FROM client_profiles
         WHERE user_id = $1`,
        [userId]
      );
      roleProfile = cp.rows[0] || null;
    }

    let averageRating = null;
    let totalReviews = 0;

    if (user.role === "freelancer") {
      const r = await pool.query(
        `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_reviews
         FROM reviews
         WHERE reviewee_id = $1`,
        [userId]
      );
      totalReviews = parseInt(r.rows[0].total_reviews, 10);
      if (totalReviews > 0) averageRating = Number(r.rows[0].avg_rating).toFixed(2);
    }

    return res.json({
      success: true,
      data: {
        user,
        profile: roleProfile,
        average_rating: averageRating,
        total_reviews: totalReviews
      }
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Profilni olishda xato yuz berdi.",
      error: error.message
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role === "freelancer") {
      const {
        title,
        bio,
        hourly_rate,
        location,
        languages,
        skills,
        portfolio_urls,
        avatar_url,
        cover_url,
        availability_status
      } = req.body;

      const result = await pool.query(
        `INSERT INTO freelancer_profiles (
          user_id, title, bio, hourly_rate, location, languages, skills, portfolio_urls,
          avatar_url, cover_url, availability_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11
        )
        ON CONFLICT (user_id) DO UPDATE SET
          title = COALESCE(EXCLUDED.title, freelancer_profiles.title),
          bio = COALESCE(EXCLUDED.bio, freelancer_profiles.bio),
          hourly_rate = COALESCE(EXCLUDED.hourly_rate, freelancer_profiles.hourly_rate),
          location = COALESCE(EXCLUDED.location, freelancer_profiles.location),
          languages = COALESCE(EXCLUDED.languages, freelancer_profiles.languages),
          skills = COALESCE(EXCLUDED.skills, freelancer_profiles.skills),
          portfolio_urls = COALESCE(EXCLUDED.portfolio_urls, freelancer_profiles.portfolio_urls),
          avatar_url = COALESCE(EXCLUDED.avatar_url, freelancer_profiles.avatar_url),
          cover_url = COALESCE(EXCLUDED.cover_url, freelancer_profiles.cover_url),
          availability_status = COALESCE(EXCLUDED.availability_status, freelancer_profiles.availability_status),
          updated_at = NOW()
        RETURNING *`,
        [
          userId,
          title ?? null,
          bio ?? null,
          hourly_rate ?? null,
          location ?? null,
          JSON.stringify(languages ?? []),
          JSON.stringify(skills ?? []),
          JSON.stringify(portfolio_urls ?? []),
          avatar_url ?? null,
          cover_url ?? null,
          availability_status ?? null
        ]
      );

      return res.json({ success: true, message: "Freelancer profili yangilandi!", data: { profile: result.rows[0] } });
    }

    if (role === "client") {
      const { company_name, company_website, company_size } = req.body;

      const result = await pool.query(
        `INSERT INTO client_profiles (
          user_id, company_name, company_website, company_size
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET
          company_name = COALESCE(EXCLUDED.company_name, client_profiles.company_name),
          company_website = COALESCE(EXCLUDED.company_website, client_profiles.company_website),
          company_size = COALESCE(EXCLUDED.company_size, client_profiles.company_size),
          updated_at = NOW()
        RETURNING *`,
        [userId, company_name ?? null, company_website ?? null, company_size ?? null]
      );

      return res.json({ success: true, message: "Client profili yangilandi!", data: { profile: result.rows[0] } });
    }

    return res.status(400).json({ success: false, message: "Role noto‘g‘ri yoki qo‘llab-quvvatlanmagan." });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Profilni yangilashda xato yuz berdi.",
      error: error.message
    });
  }
};

module.exports = { getMyProfile, getUserProfile, updateMyProfile };
