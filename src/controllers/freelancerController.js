const pool = require("../db/pool");

// helper: skills query -> array
function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  return String(skills).split(",").map((s) => s.trim()).filter(Boolean);
}

const getFreelancers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (p - 1) * l;

    // Landing page dagi query bilan bir xil asos
    let where = "WHERE u.role = 'freelancer'";
    const params = [];

    if (search && search.trim()) {
      where += ` AND (
        u.first_name ILIKE $1 OR 
        u.last_name ILIKE $1 OR 
        fp.title ILIKE $1 OR 
        fp.bio ILIKE $1 OR
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(fp.skills, '[]'::jsonb)) s 
          WHERE s ILIKE $1
        )
      )`;
      params.push(`%${search.trim()}%`);
    }

    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM users u LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id ${where}`,
      params
    );

    const listR = await pool.query(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        COALESCE(fp.title, 'Freelancer') AS title,
        fp.bio,
        COALESCE(fp.hourly_rate, 0) AS hourly_rate,
        fp.location,
        fp.skills,
        COALESCE(fp.rating, 0) AS rating,
        COALESCE(fp.completed_jobs, 0) AS completed_jobs
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${where}
      ORDER BY fp.rating DESC NULLS LAST, u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
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
        },
      },
    });
  } catch (error) {
    console.error("Get freelancers error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getRecommendedFreelancers = async (req, res) => {
  try {
    const jobId = req.query.job_id || req.query.project_id;
    if (!jobId) return res.status(400).json({ success: false, message: "job_id kerak." });

    const jobR = await pool.query(`SELECT id, title, required_skills FROM jobs WHERE id = $1 LIMIT 1`, [jobId]);
    if (jobR.rows.length === 0) return res.status(404).json({ success: false, message: "Loyiha topilmadi." });

    const requiredSkills = jobR.rows[0]?.required_skills || [];
    const skillArr = Array.isArray(requiredSkills) ? requiredSkills : [];

    let where = "WHERE u.role = 'freelancer'";
    const params = [];
    if (skillArr.length > 0) {
      where += " AND (fp.skills ?| $1::text[])";
      params.push(skillArr);
    }

    const r = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, fp.title, fp.bio, fp.hourly_rate, fp.location, fp.skills, fp.avatar_url, fp.rating, fp.completed_jobs
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${where}
      ORDER BY fp.rating DESC NULLS LAST LIMIT 5
    `, params);

    return res.json({ success: true, data: { freelancers: r.rows } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getFreelancerById = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.phone, fp.title, fp.bio, fp.hourly_rate, fp.location, fp.skills, COALESCE(fp.avatar_url, u.avatar_url) as avatar_url, fp.rating, fp.completed_jobs
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'freelancer' LIMIT 1
    `, [id]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: "Freelancer topilmadi." });
    return res.json({ success: true, data: { freelancer: r.rows[0] } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const activatePremium = async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(`UPDATE users SET is_premium = TRUE, premium_until = COALESCE(premium_until, NOW()) + INTERVAL '30 days' WHERE id = $1 RETURNING id, is_premium, premium_until`, [userId]);
    return res.json({ success: true, data: { premium: r.rows[0] } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const aiPortfolio = async (req, res) => {
  return res.json({ success: true, data: { portfolio: { bio: "AI Generated Bio", items: [] } } });
};

const getSavedFreelancers = async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, fp.title, fp.avatar_url, fp.rating
      FROM saved_items s
      JOIN users u ON u.id = s.item_id
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE s.user_id = $1 AND s.item_type = 'freelancer' AND u.role = 'freelancer'
    `, [userId]);
    return res.json({ success: true, data: { freelancers: r.rows } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const saveFreelancer = async (req, res) => {
  try {
    const userId = req.user.id;
    const freelancerId = req.params.id;
    const existing = await pool.query(`SELECT id FROM saved_items WHERE user_id = $1 AND item_id = $2 AND item_type = 'freelancer'`, [userId, freelancerId]);
    if (existing.rows.length > 0) {
      await pool.query(`DELETE FROM saved_items WHERE id = $1`, [existing.rows[0].id]);
      return res.json({ success: true, saved: false });
    }
    await pool.query(`INSERT INTO saved_items (user_id, item_id, item_type) VALUES ($1, $2, 'freelancer')`, [userId, freelancerId]);
    return res.json({ success: true, saved: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const uploadMyCv = async (req, res) => res.json({ success: true });
const deleteMyCv = async (req, res) => res.json({ success: true });
const getMyPortfolio = async (req, res) => res.json({ success: true, data: { items: [] } });
const getPublicPortfolioByFreelancerId = async (req, res) => res.json({ success: true, data: { items: [] } });
const createPortfolioItem = async (req, res) => res.json({ success: true });
const updatePortfolioItem = async (req, res) => res.json({ success: true });
const deletePortfolioItem = async (req, res) => res.json({ success: true });
const addPortfolioMedia = async (req, res) => res.json({ success: true });
const deletePortfolioMedia = async (req, res) => res.json({ success: true });

module.exports = {
  getFreelancers,
  getRecommendedFreelancers,
  getFreelancerById,
  activatePremium,
  aiPortfolio,
  getSavedFreelancers,
  saveFreelancer,
  uploadMyCv,
  deleteMyCv,
  getMyPortfolio,
  getPublicPortfolioByFreelancerId,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  addPortfolioMedia,
  deletePortfolioMedia,
};
