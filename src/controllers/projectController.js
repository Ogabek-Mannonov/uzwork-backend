// src/controllers/projectController.js
const pool = require('../db/pool');

/**
 * POST /projects
 * Create a new project (only clients can create)
 */
const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar loyiha yaratishi mumkin.'
      });
    }

    const {
      title,
      description,
      category,
      skills,
      budget_type,
      budget_min,
      budget_max,
      hourly_rate,
      duration,
      experience_level,
      attachments
    } = req.body;

    // Validation (using new schema: job_type instead of budget_type)
    if (!title || !description || !budget_type) {
      return res.status(400).json({
        success: false,
        message: 'Title, description va budget_type (job_type) majburiy maydonlar.'
      });
    }

    if (!['fixed', 'hourly'].includes(budget_type)) {
      return res.status(400).json({
        success: false,
        message: 'Budget_type (job_type) "fixed" yoki "hourly" bo\'lishi kerak.'
      });
    }

    if (budget_type === 'fixed' && (!budget_min || !budget_max)) {
      return res.status(400).json({
        success: false,
        message: 'Fixed budget uchun budget_min va budget_max kerak.'
      });
    }

    // Hourly jobs don't need hourly_rate in new schema - just budget_min/max
    if (budget_type === 'hourly' && (!budget_min || !budget_max)) {
      return res.status(400).json({
        success: false,
        message: 'Hourly budget uchun budget_min va budget_max kerak.'
      });
    }

    // Insert job (using new schema: jobs table with job_type instead of budget_type)
    const result = await pool.query(
      `INSERT INTO jobs (
        client_id, title, description, job_type,
        budget_min, budget_max, currency, required_skills, attachments, deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        title,
        description,
        budget_type, // job_type in new schema
        budget_min || null,
        budget_max || null,
        'UZS', // default currency
        skills || [], // required_skills in new schema
        attachments || [],
        duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null // convert duration days to deadline
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Loyiha muvaffaqiyatli yaratildi!',
      data: {
        project: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyiha yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /projects
 * Get all projects with filters and pagination
 */
// GET /projects
const getProjects = async (req, res) => {
  try {
    const {
      status = "open",          // open | in_progress | completed | cancelled | all
      category,
      budget_type,              // fixed | hourly  (DBda job_type)
      experience_level,
      min_budget,
      max_budget,
      search,
      page = 1,
      limit = 20,
      sort_by = "created_at",
      order = "DESC",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const validSortColumns = ["created_at", "budget_min", "budget_max", "title"];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : "created_at";
    const sortOrder = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    // ✅ WHERE clause build
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // ✅ status=all bo'lsa filter qilmaymiz
    if (status && status !== "all") {
      whereConditions.push(`j.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (category) {
      whereConditions.push(`j.category = $${paramIndex++}`);
      queryParams.push(category);
    }

    // ✅ frontend budget_type -> DB job_type
    if (budget_type) {
      whereConditions.push(`j.job_type = $${paramIndex++}`);
      queryParams.push(budget_type);
    }

    if (experience_level) {
      whereConditions.push(`j.experience_level = $${paramIndex++}`);
      queryParams.push(experience_level);
    }

    if (min_budget) {
      whereConditions.push(`j.budget_max >= $${paramIndex++}`);
      queryParams.push(parseFloat(min_budget));
    }

    if (max_budget) {
      whereConditions.push(`j.budget_min <= $${paramIndex++}`);
      queryParams.push(parseFloat(max_budget));
    }

    if (search) {
      whereConditions.push(
        `(j.title ILIKE $${paramIndex} OR j.description ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // ✅ total count
    const countQuery = `SELECT COUNT(*) FROM jobs j ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // ✅ data query (proposals_count bilan)
    const jobsQuery = `
      SELECT 
        j.*,
        u.id as client_id,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.username as client_username,
        u.email as client_email,
        COALESCE(COUNT(p.id), 0)::int as proposals_count
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      LEFT JOIN proposals p ON p.job_id = j.id
      ${whereClause}
      GROUP BY j.id, u.id
      ORDER BY j.${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const finalParams = [...queryParams, limitNum, offset];
    const jobsResult = await pool.query(jobsQuery, finalParams);

    res.json({
      success: true,
      data: {
        projects: jobsResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: "Loyihalarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};


/**
 * GET /projects/:id
 * Get project by ID
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        j.*,
        u.id as client_id,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.email as client_email,
        (SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposals_count
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      WHERE j.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    res.json({
      success: true,
      data: {
        project: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyihani olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /projects/:id
 * Update project (only owner can update)
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar loyihani yangilashi mumkin.'
      });
    }

    // Check if project exists and user is owner
    const projectCheck = await pool.query(
      'SELECT client_id, status FROM jobs WHERE id = $1',
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    if (projectCheck.rows[0].client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu loyihaning egasi emassiz.'
      });
    }

    if (projectCheck.rows[0].status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "open" statusdagi loyihalarni yangilash mumkin.'
      });
    }

    const {
      title,
      description,
      category,
      skills,
      budget_type,
      budget_min,
      budget_max,
      hourly_rate,
      duration,
      experience_level,
      attachments
    } = req.body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description);
    }
    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(category);
    }
    if (skills !== undefined) {
      updateFields.push(`skills = $${paramIndex++}`);
      updateValues.push(skills);
    }
    if (budget_type !== undefined) {
      updateFields.push(`budget_type = $${paramIndex++}`);
      updateValues.push(budget_type);
    }
    if (budget_min !== undefined) {
      updateFields.push(`budget_min = $${paramIndex++}`);
      updateValues.push(budget_min);
    }
    if (budget_max !== undefined) {
      updateFields.push(`budget_max = $${paramIndex++}`);
      updateValues.push(budget_max);
    }
    if (hourly_rate !== undefined) {
      updateFields.push(`hourly_rate = $${paramIndex++}`);
      updateValues.push(hourly_rate);
    }
    if (duration !== undefined) {
      updateFields.push(`duration = $${paramIndex++}`);
      updateValues.push(duration);
    }
    if (experience_level !== undefined) {
      updateFields.push(`experience_level = $${paramIndex++}`);
      updateValues.push(experience_level);
    }
    if (attachments !== undefined) {
      updateFields.push(`attachments = $${paramIndex++}`);
      updateValues.push(attachments);
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
      UPDATE projects 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Loyiha muvaffaqiyatli yangilandi!',
      data: {
        project: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyihani yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * DELETE /projects/:id
 * Delete project (only owner can delete)
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar loyihani o\'chirishi mumkin.'
      });
    }

    // Check if project exists and user is owner
    const projectCheck = await pool.query(
      'SELECT client_id, status FROM jobs WHERE id = $1',
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    if (projectCheck.rows[0].client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu loyihaning egasi emassiz.'
      });
    }

    // Delete project (CASCADE will handle related records)
    await pool.query('UPDATE jobs SET deleted_at = NOW() WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Loyiha muvaffaqiyatli o\'chirildi!'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyihani o\'chirishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /projects/my
 * Get current user's projects
 */
const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query;
    let params;

    if (userRole === 'client') {
      // Client sees their own projects
      if (status) {
        query = `
          SELECT 
            j.*,
            (SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposals_count
          FROM jobs j
          WHERE j.client_id = $1 AND j.status = $2
          ORDER BY j.created_at DESC
          LIMIT $3 OFFSET $4
        `;
        params = [userId, status, parseInt(limit), offset];
      } else {
        query = `
          SELECT 
            j.*,
            (SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposals_count
          FROM jobs j
          WHERE j.client_id = $1
          ORDER BY j.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [userId, parseInt(limit), offset];
      }
    } else {
      // Freelancer sees projects they have proposals for
      if (status) {
        query = `
          SELECT DISTINCT
            j.*,
            pr.status as proposal_status,
            (SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposals_count
          FROM jobs j
          JOIN proposals pr ON j.id = pr.job_id
          WHERE pr.freelancer_id = $1 AND j.status = $2
          ORDER BY j.created_at DESC
          LIMIT $3 OFFSET $4
        `;
        params = [userId, status, parseInt(limit), offset];
      } else {
        query = `
          SELECT DISTINCT
            j.*,
            pr.status as proposal_status,
            (SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposals_count
          FROM jobs j
          JOIN proposals pr ON j.id = pr.job_id
          WHERE pr.freelancer_id = $1
          ORDER BY j.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [userId, parseInt(limit), offset];
      }
    }

    const result = await pool.query(query, params);

    // Get total count
    let countQuery;
    let countParams;
    if (userRole === 'client') {
      if (status) {
        countQuery = 'SELECT COUNT(*) FROM jobs WHERE client_id = $1 AND status = $2';
        countParams = [userId, status];
      } else {
        countQuery = 'SELECT COUNT(*) FROM jobs WHERE client_id = $1';
        countParams = [userId];
      }
    } else {
      if (status) {
        countQuery = `
          SELECT COUNT(DISTINCT j.id) 
          FROM jobs j
          JOIN proposals pr ON j.id = pr.job_id
          WHERE pr.freelancer_id = $1 AND p.status = $2
        `;
        countParams = [userId, status];
      } else {
        countQuery = `
          SELECT COUNT(DISTINCT j.id) 
          FROM jobs j
          JOIN proposals pr ON j.id = pr.job_id
          WHERE pr.freelancer_id = $1
        `;
        countParams = [userId];
      }
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        projects: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /projects/recommended
 * Get recommended projects for current freelancer (AI-based)
 */
const getRecommendedProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancerlar uchun.'
      });
    }

    // Get freelancer skills
    const freelancerResult = await pool.query(
      'SELECT skills FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    const freelancerSkills = freelancerResult.rows[0]?.skills || [];

    // Get recommended projects based on skills match
    const projectsQuery = `
      SELECT 
        j.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        (SELECT COUNT(*) FROM proposals WHERE job_id = j.id) as proposals_count,
        CASE 
          WHEN p.skills && $1::text[] THEN 1
          ELSE 0
        END as skill_match
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      WHERE p.status = 'open'
        AND ($1::text[] IS NULL OR p.skills && $1::text[])
      ORDER BY skill_match DESC, p.created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(projectsQuery, [freelancerSkills.length > 0 ? freelancerSkills : null]);

    res.json({
      success: true,
      message: 'Tavsiya etilgan loyihalar',
      data: {
        projects: result.rows
      }
    });
  } catch (error) {
    console.error('Get recommended projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Tavsiya etilgan loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /projects/:id/boost
 * Boost project (paid feature - 150,000 UZS)
 */
const boostProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar loyihani boost qilishi mumkin.'
      });
    }

    // Check if project exists and user is owner
    const projectCheck = await pool.query(
      'SELECT client_id, status FROM jobs WHERE id = $1',
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    if (projectCheck.rows[0].client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu loyihaning egasi emassiz.'
      });
    }

    if (projectCheck.rows[0].status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "open" statusdagi loyihalarni boost qilish mumkin.'
      });
    }

    // TODO: Check payment/balance (150,000 UZS)
    // TODO: Add boost_expires_at field to projects table
    // For now, just return success

    res.json({
      success: true,
      message: 'Loyiha boost qilindi! (150 000 so\'m)'
    });
  } catch (error) {
    console.error('Boost project error:', error);
    res.status(500).json({
      success: false,
      message: 'Loyihani boost qilishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /projects/:id/ai-translate
 * Auto translate project description
 */
const aiTranslate = async (req, res) => {
  try {
    const { id } = req.params;
    const { to_lang = 'ru' } = req.query;

    const projectResult = await pool.query(
      'SELECT title, description FROM jobs WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    // TODO: Integrate with translation API
    const translated = {
      title: projectResult.rows[0].title,
      description: projectResult.rows[0].description
    };

    res.json({
      success: true,
      data: {
        original: {
          title: projectResult.rows[0].title,
          description: projectResult.rows[0].description
        },
        translated,
        to_lang
      }
    });
  } catch (error) {
    console.error('AI translate error:', error);
    res.status(500).json({
      success: false,
      message: 'Tarjima qilishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /projects/saved
 * Get saved projects (freelancer)
 */
const getSavedProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT 
        j.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name
      FROM saved_items s
      JOIN jobs j ON s.item_id = j.id
      JOIN users u ON j.client_id = u.id
      WHERE s.user_id = $1 AND s.item_type = 'project'
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        projects: result.rows
      }
    });
  } catch (error) {
    console.error('Get saved projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Saqlangan loyihalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /projects/:id/save
 * Save project
 */
const saveProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await pool.query(
      'SELECT id FROM saved_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, 'project', id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Loyiha allaqachon saqlangan.'
      });
    }

    await pool.query(
      'INSERT INTO saved_items (user_id, item_type, item_id) VALUES ($1, $2, $3)',
      [userId, 'project', id]
    );

    res.json({
      success: true,
      message: 'Loyiha saqlandi!'
    });
  } catch (error) {
    console.error('Save project error:', error);
    res.status(500).json({
      success: false,
      message: 'Saqlashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /projects/:id/report
 * Report project
 */
const reportProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason, description } = req.body;

    if (!reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Reason va description kerak.'
      });
    }

    // TODO: Create reports table or use support_tickets
    res.json({
      success: true,
      message: 'Shikoyat yuborildi!'
    });
  } catch (error) {
    console.error('Report project error:', error);
    res.status(500).json({
      success: false,
      message: 'Shikoyat yuborishda xato yuz berdi.',
      error: error.message
    });
  }
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


