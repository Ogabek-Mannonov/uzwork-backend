// src/controllers/freelancerController.js
const pool = require("../db/pool");

// helper: skills query -> array
function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  // "react,nodejs"
  return String(skills)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * GET /freelancers
 * Query: skills, min_rating, location, availability, page, limit
 */
const getFreelancers = async (req, res) => {
  try {
    const { skills, min_rating, location, availability, page = 1, limit = 20 } = req.query;

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    let where = `WHERE u.role = 'freelancer' AND u.deleted_at IS NULL`;
    const params = [];
    let i = 1;

    const skillArr = normalizeSkills(skills);
    if (skillArr.length > 0) {
      // fp.skills jsonb array bo'lsa: ?| operatori
      where += ` AND (fp.skills ?| $${i++}::text[])`;
      params.push(skillArr);
    }

    if (location) {
      where += ` AND fp.location ILIKE $${i++}`;
      params.push(`%${location}%`);
    }

    if (availability) {
      where += ` AND fp.availability_status = $${i++}`;
      params.push(String(availability));
    }

    if (min_rating) {
      where += ` AND COALESCE(fp.rating, 0) >= $${i++}`;
      params.push(Number(min_rating));
    }

    const countR = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${where}
      `,
      params
    );

    const listR = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        u.phone,
        u.is_kyc_verified,
        u.kyc_status,

        fp.user_id,
        fp.title,
        fp.bio,
        fp.hourly_rate,
        fp.location,
        fp.languages,
        fp.skills,
        fp.portfolio_urls,
        fp.avatar_url,
        fp.cover_url,
        fp.availability_status,
        fp.rating,
        fp.completed_jobs,
        fp.created_at,
        fp.updated_at
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${where}
      ORDER BY COALESCE(fp.rating, 0) DESC, u.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, l, offset]
    );

    return res.json({
      success: true,
      data: {
        freelancers: listR.rows,
        pagination: {
          page: p,
          limit: l,
          total: countR.rows[0]?.c || 0,
          totalPages: Math.ceil((countR.rows[0]?.c || 0) / l),
        },
      },
    });
  } catch (error) {
    console.error("Get freelancers error:", error);
    return res.status(500).json({
      success: false,
      message: "Freelancerlarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /freelancers/recommended?job_id=...  (yoki project_id)
 * jobs.required_skills (jsonb) ga qarab mos freelancerlar
 */
const getRecommendedFreelancers = async (req, res) => {
  try {
    const jobId = req.query.job_id || req.query.project_id;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "job_id kerak.",
      });
    }

    const jobR = await pool.query(
      `SELECT id, title, required_skills
       FROM jobs
       WHERE id = $1
       LIMIT 1`,
      [jobId]
    );

    if (jobR.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loyiha (job) topilmadi.",
      });
    }

    const requiredSkills = jobR.rows[0]?.required_skills || [];
    const skillArr = Array.isArray(requiredSkills) ? requiredSkills : [];

    // agar skillArr bo'sh bo'lsa — top rating bo'yicha qaytaramiz
    let where = `WHERE u.role = 'freelancer' AND u.deleted_at IS NULL`;
    const params = [];
    let i = 1;

    if (skillArr.length > 0) {
      where += ` AND (fp.skills ?| $${i++}::text[])`;
      params.push(skillArr);
    }

    // faqat available bo'lganlarni tavsiya qilamiz
    where += ` AND fp.availability_status = 'available'`;

    const r = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        fp.title,
        fp.bio,
        fp.hourly_rate,
        fp.location,
        fp.skills,
        fp.avatar_url,
        fp.availability_status,
        fp.rating,
        fp.completed_jobs
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${where}
      ORDER BY COALESCE(fp.rating, 0) DESC, COALESCE(fp.completed_jobs,0) DESC, u.created_at DESC
      LIMIT 5
      `,
      params
    );

    return res.json({
      success: true,
      message: "Tavsiya etilgan freelancerlar",
      data: {
        job: { id: jobR.rows[0].id, title: jobR.rows[0].title, required_skills: requiredSkills },
        freelancers: r.rows,
      },
    });
  } catch (error) {
    console.error("Get recommended freelancers error:", error);
    return res.status(500).json({
      success: false,
      message: "Tavsiya etilgan freelancerlarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /freelancers/:id
 */
const getFreelancerById = async (req, res) => {
  try {
    const { id } = req.params;

    const r = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        u.phone,
        u.is_kyc_verified,
        u.kyc_status,

        fp.user_id,
        fp.title,
        fp.bio,
        fp.hourly_rate,
        fp.location,
        fp.languages,
        fp.skills,
        fp.portfolio_urls,
        fp.avatar_url,
        fp.cover_url,
        fp.availability_status,
        fp.rating,
        fp.completed_jobs,
        fp.created_at,
        fp.updated_at
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE u.id = $1
        AND u.role = 'freelancer'
        AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Freelancer topilmadi." });
    }

    return res.json({ success: true, data: { freelancer: r.rows[0] } });
  } catch (error) {
    console.error("Get freelancer by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Freelancerni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /freelancers/premium
 * Minimal demo: users.is_premium + premium_until update
 */
const activatePremium = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = String(req.user.role || "").toLowerCase();

    if (role !== "freelancer") {
      return res.status(403).json({
        success: false,
        message: "Faqat freelancerlar premium olishi mumkin.",
      });
    }

    // 30 kun qo'shamiz
    const r = await pool.query(
      `
      UPDATE users
      SET is_premium = TRUE,
          premium_until = COALESCE(premium_until, NOW()) + INTERVAL '30 days',
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, is_premium, premium_until
      `,
      [userId]
    );

    return res.json({
      success: true,
      message: "Premium faollashtirildi (30 kun).",
      data: { premium: r.rows[0] },
    });
  } catch (error) {
    console.error("Activate premium error:", error);
    return res.status(500).json({
      success: false,
      message: "Premium faollashtirishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /freelancers/me/ai-portfolio
 * (placeholder) — keyin AI service ulanadi
 */
const aiPortfolio = async (req, res) => {
  try {
    const { skills, experience } = req.body;

    const portfolio = {
      bio: `Experienced ${Array.isArray(skills) ? skills.join(", ") : "freelancer"} with ${experience || "solid"} experience.`,
      items: [],
    };

    return res.json({ success: true, data: { portfolio } });
  } catch (error) {
    console.error("AI portfolio error:", error);
    return res.status(500).json({
      success: false,
      message: "Portfolio yaratishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /freelancers/saved
 * client saved freelancers
 */
const getSavedFreelancers = async (req, res) => {
  try {
    const userId = req.user.id;

    const r = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        fp.title,
        fp.bio,
        fp.location,
        fp.hourly_rate,
        fp.skills,
        fp.avatar_url,
        fp.rating
      FROM saved_items s
      JOIN users u ON u.id = s.item_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE s.user_id = $1
        AND s.item_type = 'freelancer'
        AND u.role = 'freelancer'
        AND u.deleted_at IS NULL
      ORDER BY s.created_at DESC
      `,
      [userId]
    );

    return res.json({ success: true, data: { freelancers: r.rows } });
  } catch (error) {
    console.error("Get saved freelancers error:", error);
    return res.status(500).json({
      success: false,
      message: "Saqlangan freelancerlarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /freelancers/:id/save
 */
const saveFreelancer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: freelancerId } = req.params;

    // freelancer mavjudmi?
    const fR = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'freelancer' AND deleted_at IS NULL LIMIT 1`,
      [freelancerId]
    );
    if (fR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Freelancer topilmadi." });
    }

    const existing = await pool.query(
      `SELECT id FROM saved_items WHERE user_id = $1 AND item_type = 'freelancer' AND item_id = $2 LIMIT 1`,
      [userId, freelancerId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Freelancer allaqachon saqlangan.",
      });
    }

    await pool.query(
      `INSERT INTO saved_items (user_id, item_type, item_id, created_at)
       VALUES ($1, 'freelancer', $2, NOW())`,
      [userId, freelancerId]
    );

    return res.json({ success: true, message: "Freelancer saqlandi!" });
  } catch (error) {
    console.error("Save freelancer error:", error);
    return res.status(500).json({
      success: false,
      message: "Saqlashda xato yuz berdi.",
      error: error.message,
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
  saveFreelancer,
};
