const pool = require("../db/pool");

// helper: skills query -> array
function normalizeSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  return String(skills).split(",").map((s) => s.trim()).filter(Boolean);
}

const getFreelancers = async (req, res) => {
  try {
    const { 
      search, 
      page = 1, 
      limit = 10,
      location,
      min_rate,
      max_rate,
      min_rating,
      language,
      proficiency,
      level // alias
    } = req.query;

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (p - 1) * l;

    let where = "WHERE u.role = 'freelancer'";
    const params = [];
    let paramIdx = 1;

    // 1. Text Search
    if (search && search.trim()) {
      where += ` AND (
        u.first_name ILIKE $${paramIdx} OR 
        u.last_name ILIKE $${paramIdx} OR 
        fp.title ILIKE $${paramIdx} OR 
        fp.bio ILIKE $${paramIdx} OR
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(fp.skills, '[]'::jsonb)) s 
          WHERE s ILIKE $${paramIdx}
        )
      )`;
      params.push(`%${search.trim()}%`);
      paramIdx++;
    }

    // 2. Location
    if (location) {
      where += ` AND fp.location = $${paramIdx}`;
      params.push(location);
      paramIdx++;
    }

    // 3. Hourly Rate
    if (min_rate) {
      where += ` AND fp.hourly_rate >= $${paramIdx}`;
      params.push(parseFloat(min_rate));
      paramIdx++;
    }
    if (max_rate) {
      where += ` AND fp.hourly_rate <= $${paramIdx}`;
      params.push(parseFloat(max_rate));
      paramIdx++;
    }

    // 4. Rating
    if (min_rating) {
      where += ` AND fp.rating >= $${paramIdx}`;
      params.push(parseFloat(min_rating));
      paramIdx++;
    }

    // 5. Language & Proficiency
    // frontenddan 'proficiency' yoki 'level' kelishi mumkin
    const targetLevel = proficiency || level;
    if (language) {
      if (targetLevel) {
        // Ikkalasi ham bo'lsa: aynan shu til va shu darajaga ega bo'lgan ob'ektni qidiramiz
        where += ` AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(fp.languages, '[]'::jsonb)) lang
          WHERE lang->>'language' = $${paramIdx} AND lang->>'proficiency' = $${paramIdx + 1}
        )`;
        params.push(language);
        params.push(targetLevel);
        paramIdx += 2;
      } else {
        // Faqat til bo'lsa
        where += ` AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(fp.languages, '[]'::jsonb)) lang
          WHERE lang->>'language' = $${paramIdx}
        )`;
        params.push(language);
        paramIdx++;
      }
    }

    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM users u LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id ${where}`,
      params
    );

    // Debug uchun log
    console.log(`[Freelancer Search] Page: ${p}, Limit: ${l}, Offset: ${offset}, Params: ${JSON.stringify(params)}`);

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
        fp.languages,
        COALESCE(fp.rating, 0) AS rating,
        COALESCE(fp.completed_jobs, 0) AS completed_jobs
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${where}
      ORDER BY fp.rating DESC NULLS LAST, u.created_at DESC, u.id ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
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
const getMyPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await pool.query(`
      SELECT * FROM portfolio_items 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

    // Har bir element uchun mediasini ham olamiz
    const enrichedItems = await Promise.all(items.rows.map(async (item) => {
      const media = await pool.query(`SELECT * FROM portfolio_media WHERE item_id = $1`, [item.id]);
      return { ...item, media: media.rows };
    }));

    return res.json({ success: true, data: { items: enrichedItems } });
  } catch (error) {
    console.error("Get portfolio error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getPublicPortfolioByFreelancerId = async (req, res) => {
  try {
    const { id } = req.params;
    const items = await pool.query(`
      SELECT * FROM portfolio_items 
      WHERE user_id = $1 
      ORDER BY is_featured DESC, created_at DESC
    `, [id]);

    const enrichedItems = await Promise.all(items.rows.map(async (item) => {
      const media = await pool.query(`SELECT * FROM portfolio_media WHERE item_id = $1`, [item.id]);
      return { ...item, media: media.rows };
    }));

    return res.json({ success: true, data: { items: enrichedItems } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const createPortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, role, description, project_url, skills, is_featured } = req.body;

    const r = await pool.query(`
      INSERT INTO portfolio_items (user_id, title, role, description, project_url, skills, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, title, role, description, project_url, JSON.stringify(skills || []), is_featured || false]);

    return res.json({ success: true, data: { item: r.rows[0] } });
  } catch (error) {
    console.error("Create portfolio error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updatePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { title, role, description, project_url, skills, is_featured } = req.body;

    const r = await pool.query(`
      UPDATE portfolio_items 
      SET title = $1, role = $2, description = $3, project_url = $4, skills = $5, is_featured = $6, updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [title, role, description, project_url, JSON.stringify(skills || []), is_featured || false, itemId, userId]);

    if (r.rows.length === 0) return res.status(404).json({ success: false, message: "Element topilmadi." });
    return res.json({ success: true, data: { item: r.rows[0] } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const deletePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const r = await pool.query(`DELETE FROM portfolio_items WHERE id = $1 AND user_id = $2 RETURNING id`, [itemId, userId]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: "Element topilmadi." });
    return res.json({ success: true, message: "O'chirildi." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const addPortfolioMedia = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: "Fayl yuklanmadi." });

    const fileUrl = `/uploads/portfolio/${req.file.filename}`;
    const r = await pool.query(`
      INSERT INTO portfolio_media (item_id, url, filename, mime, size_bytes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [itemId, fileUrl, req.file.originalname, req.file.mimetype, req.file.size]);

    return res.json({ success: true, data: { media: r.rows[0] } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const deletePortfolioMedia = async (req, res) => {
  try {
    const { itemId, mediaId } = req.params;
    // Xavfsizlik uchun item_id ni ham tekshiramiz
    const r = await pool.query(`DELETE FROM portfolio_media WHERE id = $1 AND item_id = $2 RETURNING id`, [mediaId, itemId]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: "Media topilmadi." });
    return res.json({ success: true, message: "O'chirildi." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
