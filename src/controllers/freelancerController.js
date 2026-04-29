// src/controllers/freelancerController.js
const pool = require("../db/pool");
const path = require("path");

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
    const { 
      skills, 
      min_rating, 
      location, 
      availability, 
      search, 
      min_rate, 
      max_rate, 
      page = 1, 
      limit = 20 
    } = req.query;

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

    if (search) {
      where += ` AND (u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR fp.title ILIKE $${i} OR fp.bio ILIKE $${i})`;
      params.push(`%${search}%`);
      i++;
    }

    if (min_rate) {
      where += ` AND fp.hourly_rate >= $${i++}`;
      params.push(Number(min_rate));
    }

    if (max_rate) {
      where += ` AND fp.hourly_rate <= $${i++}`;
      params.push(Number(max_rate));
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

        fp.user_id,
        fp.title,
        fp.bio,
        fp.hourly_rate,
        fp.location,
        fp.languages,
        fp.skills,
        COALESCE(fp.avatar_url, u.avatar_url) as avatar_url,
        fp.cover_url,
        fp.availability_status,
        fp.rating,
        fp.completed_jobs,
        fp.created_at,
        fp.updated_at,
        (s.id IS NOT NULL) AS is_saved
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      LEFT JOIN saved_items s ON s.item_id = u.id AND s.user_id = $${i + 2} AND s.item_type = 'freelancer'
      ${where}
      ORDER BY COALESCE(fp.rating, 0) DESC, u.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, l, offset, req.user?.id || null]
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

        fp.user_id,
        fp.title,
        fp.bio,
        fp.hourly_rate,
        fp.location,
        fp.languages,
        fp.skills,
        COALESCE(fp.avatar_url, u.avatar_url) as avatar_url,
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
      await pool.query(
        `DELETE FROM saved_items WHERE id = $1`,
        [existing.rows[0].id]
      );
      return res.json({ success: true, message: "Freelancer saqlanganlardan olib tashlandi!", saved: false });
    }

    await pool.query(
      `INSERT INTO saved_items (user_id, item_type, item_id, created_at)
       VALUES ($1, 'freelancer', $2, NOW())`,
      [userId, freelancerId]
    );

    return res.json({ success: true, message: "Freelancer saqlandi!", saved: true });
  } catch (error) {
    console.error("Save freelancer error:", error);
    return res.status(500).json({
      success: false,
      message: "Saqlashda xato yuz berdi.",
      error: error.message,
    });
  }
};


const uploadMyCv = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "CV file yuborilmadi." });
    }

    // public url: server static qilib berishi kerak (quyida aytaman)
    const cvUrl = `/uploads/cv/${req.file.filename}`;

    // profile row yo'q bo'lsa ham create qilib qo'yamiz (upsert)
    const r = await pool.query(
      `
      INSERT INTO freelancer_profiles (user_id, cv_url, cv_filename, cv_updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        cv_url = EXCLUDED.cv_url,
        cv_filename = EXCLUDED.cv_filename,
        cv_updated_at = NOW(),
        updated_at = NOW()
      RETURNING user_id, cv_url, cv_filename, cv_updated_at
      `,
      [userId, cvUrl, req.file.originalname]
    );

    return res.json({
      success: true,
      message: "CV yuklandi.",
      data: { cv: r.rows[0] },
    });
  } catch (error) {
    console.error("Upload CV error:", error);
    return res.status(500).json({
      success: false,
      message: "CV yuklashda xato yuz berdi.",
      error: error.message,
    });
  }
};

const deleteMyCv = async (req, res) => {
  try {
    const userId = req.user.id;

    const r = await pool.query(
      `
      UPDATE freelancer_profiles
      SET cv_url = NULL,
          cv_filename = NULL,
          cv_updated_at = NULL,
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id
      `,
      [userId]
    );

    return res.json({ success: true, message: "CV o‘chirildi." });
  } catch (error) {
    console.error("Delete CV error:", error);
    return res.status(500).json({
      success: false,
      message: "CV o‘chirishda xato yuz berdi.",
      error: error.message,
    });
  }
};


// helper
const safeJsonArray = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * GET /freelancers/me/portfolio
 */
const getMyPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;

    const itemsR = await pool.query(
      `
      SELECT id, user_id, title, role, description, project_url, skills, is_featured, created_at, updated_at
      FROM portfolio_items
      WHERE user_id = $1
      ORDER BY is_featured DESC, created_at DESC
      `,
      [userId]
    );

    const itemIds = itemsR.rows.map((x) => x.id);
    let mediaRows = [];
    if (itemIds.length > 0) {
      const mediaR = await pool.query(
        `
        SELECT id, item_id, media_type, url, filename, mime, size_bytes, created_at
        FROM portfolio_media
        WHERE item_id = ANY($1::uuid[])
        ORDER BY created_at DESC
        `,
        [itemIds]
      );
      mediaRows = mediaR.rows;
    }

    const mediaMap = new Map();
    for (const m of mediaRows) {
      if (!mediaMap.has(m.item_id)) mediaMap.set(m.item_id, []);
      mediaMap.get(m.item_id).push(m);
    }

    const items = itemsR.rows.map((it) => ({
      ...it,
      media: mediaMap.get(it.id) || [],
    }));

    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error("Get my portfolio error:", error);
    return res.status(500).json({
      success: false,
      message: "Portfolio olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * Public: GET /freelancers/:id/portfolio
 */
const getPublicPortfolioByFreelancerId = async (req, res) => {
  try {
    const freelancerId = req.params.id;

    // freelancer mavjudligini tekshirish (optional, lekin yaxshi)
    const uR = await pool.query(
      `SELECT id FROM users WHERE id=$1 AND role='freelancer' AND deleted_at IS NULL LIMIT 1`,
      [freelancerId]
    );
    if (uR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Freelancer topilmadi." });
    }

    const itemsR = await pool.query(
      `
      SELECT id, user_id, title, role, description, project_url, skills, is_featured, created_at, updated_at
      FROM portfolio_items
      WHERE user_id = $1
      ORDER BY is_featured DESC, created_at DESC
      `,
      [freelancerId]
    );

    const itemIds = itemsR.rows.map((x) => x.id);
    let mediaRows = [];
    if (itemIds.length > 0) {
      const mediaR = await pool.query(
        `
        SELECT id, item_id, media_type, url, filename, mime, size_bytes, created_at
        FROM portfolio_media
        WHERE item_id = ANY($1::uuid[])
        ORDER BY created_at DESC
        `,
        [itemIds]
      );
      mediaRows = mediaR.rows;
    }

    const mediaMap = new Map();
    for (const m of mediaRows) {
      if (!mediaMap.has(m.item_id)) mediaMap.set(m.item_id, []);
      mediaMap.get(m.item_id).push(m);
    }

    const items = itemsR.rows.map((it) => ({
      ...it,
      media: mediaMap.get(it.id) || [],
    }));

    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error("Get public portfolio error:", error);
    return res.status(500).json({
      success: false,
      message: "Public portfolio olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /freelancers/me/portfolio
 * Body: { title, description, project_url, skills, is_featured }
 */
const createPortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, role, description, project_url, skills, is_featured } = req.body;

    if (!title || String(title).trim().length < 2) {
      return res.status(400).json({ success: false, message: "Title majburiy (kamida 2 ta belgi)." });
    }

    const skillArr = normalizeSkills(skills);

    const r = await pool.query(
      `
      INSERT INTO portfolio_items (user_id, title, role, description, project_url, skills, is_featured)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING id, user_id, title, role, description, project_url, skills, is_featured, created_at, updated_at
      `,
      [userId, title.trim(), role || null, description || null, project_url || null, JSON.stringify(skillArr), !!is_featured]
    );

    return res.status(201).json({ success: true, message: "Portfolio item yaratildi.", data: { item: r.rows[0] } });
  } catch (error) {
    console.error("Create portfolio item error:", error);
    return res.status(500).json({
      success: false,
      message: "Portfolio item yaratishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * PUT /freelancers/me/portfolio/:itemId
 */
const updatePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { title, role, description, project_url, skills, is_featured } = req.body;

    const existing = await pool.query(
      `SELECT id FROM portfolio_items WHERE id=$1 AND user_id=$2 LIMIT 1`,
      [itemId, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Portfolio item topilmadi." });
    }

    const skillArr = skills !== undefined ? safeJsonArray(skills) : undefined;

    const r = await pool.query(
      `
      UPDATE portfolio_items
      SET
        title = COALESCE($3, title),
        role = COALESCE($4, role),
        description = COALESCE($5, description),
        project_url = COALESCE($6, project_url),
        skills = COALESCE($7::jsonb, skills),
        is_featured = COALESCE($8, is_featured),
        updated_at = NOW()
      WHERE id=$1 AND user_id=$2
      RETURNING id, user_id, title, role, description, project_url, skills, is_featured, created_at, updated_at
      `,
      [
        itemId,
        userId,
        title ? String(title).trim() : null,
        role ?? null,
        description ?? null,
        project_url ?? null,
        skillArr !== undefined ? JSON.stringify(skillArr) : null,
        typeof is_featured === "boolean" ? is_featured : null,
      ]
    );

    return res.json({ success: true, message: "Portfolio item yangilandi.", data: { item: r.rows[0] } });
  } catch (error) {
    console.error("Update portfolio item error:", error);
    return res.status(500).json({
      success: false,
      message: "Portfolio item yangilashda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * DELETE /freelancers/me/portfolio/:itemId
 * (media ON DELETE CASCADE bo‘lgani uchun media ham o‘chadi)
 */
const deletePortfolioItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const r = await pool.query(
      `DELETE FROM portfolio_items WHERE id=$1 AND user_id=$2 RETURNING id`,
      [itemId, userId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Portfolio item topilmadi." });
    }

    return res.json({ success: true, message: "Portfolio item o‘chirildi." });
  } catch (error) {
    console.error("Delete portfolio item error:", error);
    return res.status(500).json({
      success: false,
      message: "Portfolio item o‘chirishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * POST /freelancers/me/portfolio/:itemId/media
 * form-data: media=<file>
 */
const addPortfolioMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    // item ownership check
    const itemR = await pool.query(
      `SELECT id FROM portfolio_items WHERE id=$1 AND user_id=$2 LIMIT 1`,
      [itemId, userId]
    );
    if (itemR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Portfolio item topilmadi." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Media file yuborilmadi." });
    }

    const isPdf = req.file.mimetype === "application/pdf";
    const mediaType = isPdf ? "document" : "image";

    const url = `/uploads/portfolio/${req.file.filename}`;

    const r = await pool.query(
      `
      INSERT INTO portfolio_media (item_id, media_type, url, filename, mime, size_bytes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, item_id, media_type, url, filename, mime, size_bytes, created_at
      `,
      [itemId, mediaType, url, req.file.originalname || null, req.file.mimetype || null, req.file.size || null]
    );

    return res.status(201).json({ success: true, message: "Media qo‘shildi.", data: { media: r.rows[0] } });
  } catch (error) {
    console.error("Add portfolio media error:", error);
    return res.status(500).json({
      success: false,
      message: "Media qo‘shishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * DELETE /freelancers/me/portfolio/:itemId/media/:mediaId
 * (DB dan o‘chiradi; xohlasangiz diskdan ham o‘chirib beramiz)
 */
const deletePortfolioMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, mediaId } = req.params;

    // ownership check via join
    const r = await pool.query(
      `
      DELETE FROM portfolio_media pm
      USING portfolio_items pi
      WHERE pm.id = $1
        AND pm.item_id = $2
        AND pm.item_id = pi.id
        AND pi.user_id = $3
      RETURNING pm.id
      `,
      [mediaId, itemId, userId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Media topilmadi." });
    }

    return res.json({ success: true, message: "Media o‘chirildi." });
  } catch (error) {
    console.error("Delete portfolio media error:", error);
    return res.status(500).json({
      success: false,
      message: "Media o‘chirishda xato yuz berdi.",
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
