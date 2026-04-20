// src/controllers/projectController.js
const pool = require('../db/pool');
const { createNotification } = require('./notificationController');

// -------------------------
// helpers
// -------------------------
const normalizeToArray = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string') {
    // "react, node" -> ["react","node"]
    return v.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const safeJsonToString = (v, fallback = []) => {
  if (v == null) return JSON.stringify(fallback);
  if (typeof v === 'string') {
    try { return JSON.stringify(JSON.parse(v)); } catch { return JSON.stringify(fallback); }
  }
  return JSON.stringify(v);
};

/**
 * POST /projects
 * Create job (client only)
 * DB: jobs(client_id,title,description,job_type,budget_min,budget_max,currency,deadline,attachments,required_skills,...)
 */
const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Faqat clientlar loyiha yaratishi mumkin.' });
    }

    const {
      title,
      description,
      budget_type, // frontend eski nom
      job_type,    // yangi nom
      budget_min,
      budget_max,
      currency,
      deadline,
      duration_days,
      skills,
      required_skills,
      attachments,
      visibility
    } = req.body;

    const jt = job_type || budget_type;

    if (!title || !description || !jt) {
      return res.status(400).json({
        success: false,
        message: "title, description va job_type (yoki budget_type) majburiy."
      });
    }

    if (!['fixed', 'hourly'].includes(jt)) {
      return res.status(400).json({
        success: false,
        message: "job_type (budget_type) faqat 'fixed' yoki 'hourly' bo‘lishi kerak."
      });
    }

    // budget_min/budget_max DB’da bor — ikkisi ham bo‘lsin
    if (budget_min == null || budget_max == null) {
      return res.status(400).json({
        success: false,
        message: "budget_min va budget_max majburiy."
      });
    }

    // deadline: to‘g‘ridan yoki duration_days orqali
    let dl = null;
    if (deadline) dl = new Date(deadline);
    else if (duration_days) dl = new Date(Date.now() + Number(duration_days) * 24 * 60 * 60 * 1000);

    const skillsArr = normalizeToArray(required_skills ?? skills);
    const attachmentsJson = safeJsonToString(attachments, []);

    const result = await pool.query(
      `
      INSERT INTO jobs (
        client_id, title, description, job_type,
        budget_min, budget_max, currency, deadline,
        required_skills, attachments, visibility
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11)
      RETURNING *
      `,
      [
        userId,
        title,
        description,
        jt,
        budget_min,
        budget_max,
        currency || 'UZS',
        dl,
        JSON.stringify(skillsArr),
        attachmentsJson,
        visibility || 'public',
      ]
    );

    const project = result.rows[0];

    // --- Start Notification Logic ---
    // Mos keladigan freelancerlarga bildirishnoma yuborish (background)
    (async () => {
      try {
        const io = req.app.get("io");
        if (skillsArr.length > 0) {
          const freelancersRes = await pool.query(
            `SELECT user_id FROM freelancer_profiles WHERE skills ?| $1::text[]`,
            [skillsArr]
          );

          for (const f of freelancersRes.rows) {
            // Loyiha egasiga yubormaslik (client freelancer ham bo'lsa)
            if (String(f.user_id) === String(userId)) continue;

            createNotification(io, {
              userId: f.user_id,
              type: 'new_job_posted',
              title: 'Yangi loyiha!',
              message: `Sizning ko'nikmalaringizga mos keladigan yangi loyiha joylandi: "${title}"`,
              relatedId: project.id,
              relatedType: 'project'
            });
          }
        }
      } catch (err) {
        console.error("New job notification error:", err);
      }
    })();
    // --- End Notification Logic ---

    return res.status(201).json({
      success: true,
      message: 'Loyiha muvaffaqiyatli yaratildi!',
      data: { project }
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loyiha yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};


/**
 * GET /projects
 * Filters: status, budget_type(job_type), min_budget, max_budget, search, page, limit
 * DB: jobs.deleted_at IS NULL
 */
const getProjects = async (req, res) => {
  try {
    const {
      status = 'open', // open | in_progress | completed | cancelled | all
      budget_type,
      job_type,
      min_budget,
      max_budget,
      search,
      proposals_tier,
      client_history,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      order = 'DESC',
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const validSortColumns = ['created_at', 'budget_min', 'budget_max', 'title'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let where = ['j.deleted_at IS NULL'];
    let params = [];
    let i = 1;

    if (status && status !== 'all') {
      where.push(`j.status = $${i++}`);
      params.push(status);
    }

    const jt = job_type || budget_type;
    if (jt) {
      where.push(`j.job_type = $${i++}`);
      params.push(jt);
    }

    if (min_budget != null) {
      where.push(`j.budget_max >= $${i++}`);
      params.push(Number(min_budget));
    }

    if (max_budget != null) {
      where.push(`j.budget_max <= $${i++}`);
      params.push(Number(max_budget));
    }

    if (search) {
      where.push(`(j.title ILIKE $${i} OR j.description ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    if (proposals_tier) {
      if (proposals_tier === 'less_5') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) < 5`);
      else if (proposals_tier === '5_10') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) BETWEEN 5 AND 10`);
      else if (proposals_tier === '10_15') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) BETWEEN 10 AND 15`);
      else if (proposals_tier === '15_50') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) BETWEEN 15 AND 50`);
    }

    if (client_history) {
      if (client_history === 'no_hires') where.push(`(cp.spent_total IS NULL OR cp.spent_total = 0)`);
      else if (client_history === 'has_hires') where.push(`coalesce(cp.spent_total, 0) > 0`);
    }

    const whereClause = where.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS c FROM jobs j LEFT JOIN client_profiles cp ON cp.user_id = j.client_id WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.c || 0;

    const listQuery = `
      SELECT
        j.*,
        u.id as client_id,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.username as client_username,
        cp.spent_total as client_spent_total,
        cp.rating as client_rating,
        (SELECT COUNT(*)::int FROM proposals pr WHERE pr.job_id = j.id) as proposals_count
      FROM jobs j
      JOIN users u ON u.id = j.client_id
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
      WHERE ${whereClause}
      ORDER BY j.${sortColumn} ${sortOrder}
      LIMIT $${i} OFFSET $${i + 1}
    `;

    params.push(parseInt(limit, 10), offset);
    const listRes = await pool.query(listQuery, params);

    return res.json({
      success: true,
      data: {
        projects: listRes.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};


/**
 * GET /projects/:id
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    // 1. Basic Job and Client Data
    const result = await pool.query(
      `
      SELECT
        j.*,
        u.id as client_id,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.username as client_username,
        u.created_at as client_member_since,
        cp.rating as client_rating,
        cp.spent_total as client_spent_total,
        cp.location as client_location,
        (SELECT COUNT(*)::int FROM proposals pr WHERE pr.job_id = j.id) as proposals_count,
        (SELECT COUNT(*)::int FROM saved_jobs sj WHERE sj.job_id = j.id AND sj.user_id = $2) > 0 as is_saved
      FROM jobs j
      JOIN users u ON u.id = j.client_id
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
      WHERE j.id = $1 AND j.deleted_at IS NULL
      `,
      [id, currentUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi.' });
    }

    const project = result.rows[0];

    // 2. Client Hire Rate Calculation
    const statsRes = await pool.query(
      `
      SELECT 
        COUNT(*)::int as total_posted,
        COUNT(DISTINCT c.job_id)::int as total_hired
      FROM jobs j
      LEFT JOIN contracts c ON c.job_id = j.id
      WHERE j.client_id = $1 AND j.deleted_at IS NULL
      `,
      [project.client_id]
    );
    
    const stats = statsRes.rows[0];
    project.client_hire_rate = stats.total_posted > 0 
      ? Math.round((stats.total_hired / stats.total_posted) * 100) 
      : 0;
    project.client_total_posted = stats.total_posted;

    return res.json({ success: true, data: { project } });
  } catch (error) {
    console.error('Get project by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loyihani olishda xato yuz berdi.',
      error: error.message
    });
  }
};


/**
 * PUT /projects/:id
 * Client (owner) only when status=open, Admin can update anything (including status)
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const admin = role === 'admin';

    if (!['client', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: "Ruxsat yo‘q." });
    }

    const check = await pool.query(
      "SELECT client_id, status FROM jobs WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Loyiha topilmadi." });
    }
    const job = check.rows[0];

    if (!admin && job.client_id !== userId) {
      return res.status(403).json({ success: false, message: "Bu loyihaning egasi emassiz." });
    }

    if (!admin && job.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "open" statusdagi loyihani yangilash mumkin.'
      });
    }

    const {
      title,
      description,
      budget_type,
      job_type,
      budget_min,
      budget_max,
      currency,
      deadline,
      skills,
      required_skills,
      attachments,
      visibility,
      status, // admin only
      is_boosted, // admin only (ixtiyoriy)
      boosted_until // admin only
    } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    const add = (sql, val) => { fields.push(sql.replace('$$', `$${i++}`)); values.push(val); };

    if (title !== undefined) add(`title = $$`, title);
    if (description !== undefined) add(`description = $$`, description);

    const jt = job_type ?? budget_type;
    if (jt !== undefined) add(`job_type = $$`, jt);

    if (budget_min !== undefined) add(`budget_min = $$`, budget_min);
    if (budget_max !== undefined) add(`budget_max = $$`, budget_max);
    if (currency !== undefined) add(`currency = $$`, currency);

    if (deadline !== undefined) add(`deadline = $$`, deadline ? new Date(deadline) : null);

    if (visibility !== undefined) add(`visibility = $$`, visibility);

    if (required_skills !== undefined || skills !== undefined) {
      const arr = normalizeToArray(required_skills ?? skills);
      add(`required_skills = $$::jsonb`, JSON.stringify(arr));
    }

    if (attachments !== undefined) {
      add(`attachments = $$::jsonb`, safeJsonToString(attachments, []));
    }

    // admin only fields
    if (admin) {
      if (status !== undefined) add(`status = $$`, status);
      if (is_boosted !== undefined) add(`is_boosted = $$`, is_boosted);
      if (boosted_until !== undefined) add(`boosted_until = $$`, boosted_until ? new Date(boosted_until) : null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Yangilash uchun maydon yuboring." });
    }

    fields.push(`updated_at = NOW()`);

    values.push(id);

    const q = `
      UPDATE jobs
      SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `;

    const result = await pool.query(q, values);

    return res.json({
      success: true,
      message: "Loyiha yangilandi!",
      data: { project: result.rows[0] }
    });
  } catch (error) {
    console.error("Update project error:", error);
    return res.status(500).json({
      success: false,
      message: "Loyihani yangilashda xato yuz berdi.",
      error: error.message
    });
  }
};


/**
 * DELETE /projects/:id
 * Soft delete: deleted_at
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const admin = role === 'admin';

    if (role !== 'client' && !admin) {
      return res.status(403).json({ success: false, message: "Faqat client yoki admin o‘chiradi." });
    }

    const check = await pool.query("SELECT client_id, deleted_at FROM jobs WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Loyiha topilmadi." });
    }

    if (check.rows[0].deleted_at) {
      return res.json({ success: true, message: "Loyiha allaqachon o‘chirilgan." });
    }

    if (!admin && check.rows[0].client_id !== userId) {
      return res.status(403).json({ success: false, message: "Bu loyihaning egasi emassiz." });
    }

    await pool.query("UPDATE jobs SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);

    return res.json({ success: true, message: "Loyiha o‘chirildi!" });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({
      success: false,
      message: "Loyihani o‘chirishda xato yuz berdi.",
      error: error.message
    });
  }
};


/**
 * GET /projects/my
 * Client: own jobs
 * Freelancer: jobs where freelancer has proposals
 */
const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = '';
    let params = [];

    if (role === 'client') {
      query = `
        SELECT
          j.*,
          (SELECT COUNT(*)::int FROM proposals pr WHERE pr.job_id = j.id) as proposals_count
        FROM jobs j
        WHERE j.client_id = $1
          AND j.deleted_at IS NULL
          ${status ? `AND j.status = $2` : ''}
        ORDER BY j.created_at DESC
        LIMIT $${status ? 3 : 2} OFFSET $${status ? 4 : 3}
      `;

      params = status
        ? [userId, status, parseInt(limit, 10), offset]
        : [userId, parseInt(limit, 10), offset];
    } else {
      // freelancer
      query = `
        SELECT DISTINCT
          j.*,
          pr.status as proposal_status,
          (SELECT COUNT(*)::int FROM proposals pr2 WHERE pr2.job_id = j.id) as proposals_count
        FROM proposals pr
        JOIN jobs j ON j.id = pr.job_id
        WHERE pr.freelancer_id = $1
          AND j.deleted_at IS NULL
          ${status ? `AND j.status = $2` : ''}
        ORDER BY j.created_at DESC
        LIMIT $${status ? 3 : 2} OFFSET $${status ? 4 : 3}
      `;

      params = status
        ? [userId, status, parseInt(limit, 10), offset]
        : [userId, parseInt(limit, 10), offset];
    }

    const result = await pool.query(query, params);

    // count
    let countQuery = '';
    let countParams = [];

    if (role === 'client') {
      countQuery = `
        SELECT COUNT(*)::int AS c
        FROM jobs
        WHERE client_id = $1
          AND deleted_at IS NULL
          ${status ? `AND status = $2` : ''}
      `;
      countParams = status ? [userId, status] : [userId];
    } else {
      countQuery = `
        SELECT COUNT(DISTINCT j.id)::int AS c
        FROM proposals pr
        JOIN jobs j ON j.id = pr.job_id
        WHERE pr.freelancer_id = $1
          AND j.deleted_at IS NULL
          ${status ? `AND j.status = $2` : ''}
      `;
      countParams = status ? [userId, status] : [userId];
    }

    const countRes = await pool.query(countQuery, countParams);
    const total = countRes.rows[0]?.c || 0;

    return res.json({
      success: true,
      data: {
        projects: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        }
      }
    });
  } catch (error) {
    console.error('Get my projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};


/**
 * GET /projects/recommended
 * DB: freelancer_profiles.skills (jsonb array), jobs.required_skills (jsonb array)
 */
const getRecommendedProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ success: false, message: 'Faqat freelancerlar uchun.' });
    }

    const {
      status = 'open',
      budget_type,
      job_type,
      min_budget,
      max_budget,
      search,
      proposals_tier,
      client_history,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const validSortColumns = ['created_at', 'budget_min', 'budget_max', 'title', 'skill_match_count'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const fr = await pool.query(
      `SELECT COALESCE(skills, '[]'::jsonb) AS skills
       FROM freelancer_profiles
       WHERE user_id = $1`,
      [userId]
    );

    const skillsArr = normalizeToArray(fr.rows[0]?.skills || []);

    let where = ['j.deleted_at IS NULL'];
    let params = [];
    let i = 1;

    if (status && status !== 'all') {
      where.push(`j.status = $${i++}`);
      params.push(status);
    }

    const jt = job_type || budget_type;
    if (jt) {
      where.push(`j.job_type = $${i++}`);
      params.push(jt);
    }

    if (min_budget != null) {
      where.push(`j.budget_max >= $${i++}`);
      params.push(Number(min_budget));
    }

    if (max_budget != null) {
      where.push(`j.budget_max <= $${i++}`);
      params.push(Number(max_budget));
    }

    if (search) {
      where.push(`(j.title ILIKE $${i} OR j.description ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    if (proposals_tier) {
      if (proposals_tier === 'less_5') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) < 5`);
      else if (proposals_tier === '5_10') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) BETWEEN 5 AND 10`);
      else if (proposals_tier === '10_15') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) BETWEEN 10 AND 15`);
      else if (proposals_tier === '15_50') where.push(`(SELECT COUNT(*) FROM proposals pr WHERE pr.job_id = j.id) BETWEEN 15 AND 50`);
    }

    if (client_history) {
      if (client_history === 'no_hires') where.push(`(cp.spent_total IS NULL OR cp.spent_total = 0)`);
      else if (client_history === 'has_hires') where.push(`coalesce(cp.spent_total, 0) > 0`);
    }

    if (skillsArr.length > 0) {
      where.push(`(COALESCE(j.required_skills,'[]'::jsonb) ?| $${i}::text[])`);
      params.push(skillsArr);
      i++;
    }

    const whereClause = where.join(' AND ');

    let skillMatchSubquery = "0 AS skill_match_count";
    if (skillsArr.length > 0) {
      skillMatchSubquery = `(
        SELECT COUNT(*)::int
        FROM jsonb_array_elements_text(COALESCE(j.required_skills,'[]'::jsonb)) s
        WHERE s.value = ANY($${params.length}::text[])
      ) AS skill_match_count`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS c FROM jobs j LEFT JOIN client_profiles cp ON cp.user_id = j.client_id WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.c || 0;

    const listQuery = `
      SELECT
        j.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.username as client_username,
        cp.spent_total as client_spent_total,
        cp.rating as client_rating,
        (SELECT COUNT(*)::int FROM proposals pr WHERE pr.job_id = j.id) as proposals_count,
        ${skillMatchSubquery}
      FROM jobs j
      JOIN users u ON u.id = j.client_id
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
      WHERE ${whereClause}
      ORDER BY j.is_boosted DESC, ${sortColumn === 'skill_match_count' ? '' : `j.${sortColumn} ${sortOrder},`} skill_match_count DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    params.push(parseInt(limit, 10), offset);
    const listRes = await pool.query(listQuery, params);

    return res.json({
      success: true,
      data: {
        projects: listRes.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        }
      }
    });
  } catch (error) {
    console.error('Get recommended projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Tavsiya etilgan loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};


/**
 * POST /projects/:id/boost
 * DB: jobs.is_boosted, jobs.boosted_until
 */
const boostProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Faqat client boost qiladi.' });
    }

    const check = await pool.query(
      `SELECT id, client_id, status, is_boosted, boosted_until
       FROM jobs
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi.' });
    }

    const job = check.rows[0];

    if (job.client_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bu loyihaning egasi emassiz.' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Faqat "open" loyihani boost qilish mumkin.' });
    }

    // 7 kunlik boost (hozircha)
    const updated = await pool.query(
      `
      UPDATE jobs
      SET is_boosted = TRUE,
          boosted_until = NOW() + INTERVAL '7 days',
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, is_boosted, boosted_until
      `,
      [id]
    );

    return res.json({
      success: true,
      message: "Loyiha boost qilindi (7 kun).",
      data: { boost: updated.rows[0] }
    });
  } catch (error) {
    console.error('Boost project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Boost qilishda xato yuz berdi.',
      error: error.message
    });
  }
};


/**
 * POST /projects/:id/ai-translate
 * stub
 */
const aiTranslate = async (req, res) => {
  try {
    const { id } = req.params;
    const { to_lang = 'ru' } = req.query;

    const projectResult = await pool.query(
      'SELECT title, description FROM jobs WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loyiha topilmadi.' });
    }

    const translated = {
      title: projectResult.rows[0].title,
      description: projectResult.rows[0].description
    };

    return res.json({
      success: true,
      data: {
        original: projectResult.rows[0],
        translated,
        to_lang
      }
    });
  } catch (error) {
    console.error('AI translate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Tarjima qilishda xato yuz berdi.',
      error: error.message
    });
  }
};


/**
 * GET /projects/saved
 * DB’da saved_items yo‘q -> 501
 */
const getSavedProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS c FROM saved_jobs WHERE user_id = $1`,
      [userId]
    );
    const total = countRes.rows[0]?.c || 0;

    const listQuery = `
      SELECT
        j.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.username as client_username,
        (SELECT COUNT(*)::int FROM proposals pr WHERE pr.job_id = j.id) as proposals_count,
        TRUE as is_saved
      FROM saved_jobs sj
      JOIN jobs j ON j.id = sj.job_id
      JOIN users u ON u.id = j.client_id
      WHERE sj.user_id = $1 AND j.deleted_at IS NULL
      ORDER BY sj.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const listRes = await pool.query(listQuery, [userId, parseInt(limit, 10), offset]);

    return res.json({
      success: true,
      data: {
        projects: listRes.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        }
      }
    });
  } catch (error) {
    console.error('Get saved projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Saqlangan loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

const saveProject = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const userId = req.user.id;

    // Check if job exists
    const jobCheck = await pool.query(
      "SELECT id FROM jobs WHERE id = $1 AND deleted_at IS NULL",
      [jobId]
    );
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Loyiha topilmadi." });
    }

    // Toggle logic
    const exists = await pool.query(
      "SELECT id FROM saved_jobs WHERE user_id = $1 AND job_id = $2",
      [userId, jobId]
    );

    if (exists.rows.length > 0) {
      await pool.query(
        "DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2",
        [userId, jobId]
      );
      return res.json({ success: true, message: "Loyiha saqlanganlardan olib tashlandi.", is_saved: false });
    } else {
      await pool.query(
        "INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)",
        [userId, jobId]
      );
      return res.json({ success: true, message: "Loyiha saqlandi.", is_saved: true });
    }
  } catch (error) {
    console.error('Save project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Loyihani saqlashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /projects/:id/report
 * report jadvali yo‘q -> 501
 */
const reportProject = async (req, res) => {
  return res.status(501).json({
    success: false,
    message: "Report funksiyasi hali yo‘q (reports/support jadvali keyin qo‘shiladi)."
  });
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getMyProjects,
  getRecommendedProjects,
  boostProject,
  aiTranslate,
  getSavedProjects,
  saveProject,
  reportProject
};
