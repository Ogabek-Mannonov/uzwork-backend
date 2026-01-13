// src/controllers/proposalController.js
const pool = require('../db/pool');

/**
 * POST /proposals
 * Create a new proposal (only freelancers can create)
 */
const createProposal = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancerlar taklif yaratishi mumkin.'
      });
    }

    const {
      job_id,
      cover_letter,
      proposed_price,       // sizning table da bor
      proposed_duration     // sizning table da bor
    } = req.body;

    // Validation
    if (!job_id || !cover_letter || !proposed_price || !proposed_duration) {
      return res.status(400).json({
        success: false,
        message: 'job_id, cover_letter, proposed_price va proposed_duration majburiy maydonlar.'
      });
    }

    // Check if project exists and is open
    const projectCheck = await pool.query(
      'SELECT id, client_id, job_type, status FROM jobs WHERE id = $1',
      [job_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    const project = projectCheck.rows[0];

    if (project.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "open" statusdagi loyihalarga taklif yuborish mumkin.'
      });
    }

    // Check if freelancer already submitted proposal
    const existingProposal = await pool.query(
      'SELECT id FROM proposals WHERE job_id = $1 AND freelancer_id = $2',
      [job_id, userId]
    );

    if (existingProposal.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Siz bu loyihaga allaqachon taklif yuborganingiz.'
      });
    }

    // Insert proposal (sizning table ga mos)
    const result = await pool.query(
      `INSERT INTO proposals (
        job_id, freelancer_id, cover_letter,
        proposed_price, proposed_duration
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        job_id,
        userId,
        cover_letter,
        proposed_price,
        proposed_duration
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Taklif muvaffaqiyatli yuborildi!',
      data: {
        proposal: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklif yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /proposals
 * Get all proposals with filters
 */
const getProposals = async (req, res) => {
  try {
    const {
      job_id,
      freelancer_id,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (job_id) {
      whereConditions.push(`p.job_id = $${paramIndex++}`);
      queryParams.push(job_id);
    }

    if (freelancer_id) {
      whereConditions.push(`p.freelancer_id = $${paramIndex++}`);
      queryParams.push(freelancer_id);
    }

    if (status) {
      whereConditions.push(`p.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM proposals p ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get proposals with user and project info
    const proposalsQuery = `
      SELECT 
        p.*,
        u.id as freelancer_id,
        u.first_name as freelancer_first_name,
        u.last_name as freelancer_last_name,
        u.email as freelancer_email,
        j.id as job_id,
        pr.title as project_title,
        pr.client_id as project_client_id
      FROM proposals p
      JOIN users u ON p.freelancer_id = u.id
      JOIN jobs j ON p.job_id = j.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const proposalsResult = await pool.query(proposalsQuery, queryParams);

    res.json({
      success: true,
      data: {
        proposals: proposalsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Takliflarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /proposals/:id
 * Get proposal by ID
 */
const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*,
        u.id as freelancer_id,
        u.first_name as freelancer_first_name,
        u.last_name as freelancer_last_name,
        u.email as freelancer_email,
        j.id as job_id,
        pr.title as project_title,
        pr.description as project_description,
        pr.client_id as project_client_id
      FROM proposals p
      JOIN users u ON p.freelancer_id = u.id
      JOIN jobs j ON p.job_id = j.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    res.json({
      success: true,
      data: {
        proposal: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get proposal by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklifni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /proposals/my
 * Get current user's proposals
 */
const getMyProposals = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE p.freelancer_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM proposals p ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get proposals
    const proposalsQuery = `
      SELECT 
        p.*,
        j.id as job_id,
        pr.title as project_title,
        pr.status as project_status,
        pr.client_id as project_client_id
      FROM proposals p
      JOIN jobs j ON p.job_id = j.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const proposalsResult = await pool.query(proposalsQuery, queryParams);

    res.json({
      success: true,
      data: {
        proposals: proposalsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get my proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Takliflarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /proposals/project/:projectId
 * Get proposals for a specific project (only project owner can view)
 */
const getProjectProposals = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if project exists
    const projectCheck = await pool.query(
      'SELECT client_id FROM jobs WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loyiha topilmadi.'
      });
    }

    const project = projectCheck.rows[0];

    if (userRole !== 'admin' && project.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu loyihaning egasi emassiz.'
      });
    }

    // Qolgan kod o‘zgarmaydi (pagination, query va h.k.)
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE p.job_id = $1';
    let queryParams = [projectId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    const countQuery = `SELECT COUNT(*) FROM proposals p ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const proposalsQuery = `
      SELECT 
        p.*,
        u.id as freelancer_id,
        u.first_name as freelancer_first_name,
        u.last_name as freelancer_last_name,
        u.email as freelancer_email
      FROM proposals p
      JOIN users u ON p.freelancer_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const proposalsResult = await pool.query(proposalsQuery, queryParams);

    res.json({
      success: true,
      data: {
        proposals: proposalsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get project proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Takliflarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};
/**
 * PUT /proposals/:id
 * Update proposal (only author can update)
 */
const updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancerlar taklifni yangilashi mumkin.'
      });
    }

    // Check if proposal exists and user is author
    const proposalCheck = await pool.query(
      'SELECT freelancer_id, status, job_id FROM proposals WHERE id = $1',
      [id]
    );

    if (proposalCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    if (proposalCheck.rows[0].freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu taklifning muallifi emassiz.'
      });
    }

    if (proposalCheck.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "pending" statusdagi takliflarni yangilash mumkin.'
      });
    }

    const {
      cover_letter,
      proposed_rate,
      proposed_amount,
      estimated_hours,
      estimated_days
    } = req.body;

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (cover_letter !== undefined) {
      updateFields.push(`cover_letter = $${paramIndex++}`);
      updateValues.push(cover_letter);
    }
    if (proposed_rate !== undefined) {
      updateFields.push(`proposed_rate = $${paramIndex++}`);
      updateValues.push(proposed_rate);
    }
    if (proposed_amount !== undefined) {
      updateFields.push(`proposed_amount = $${paramIndex++}`);
      updateValues.push(proposed_amount);
    }
    if (estimated_hours !== undefined) {
      updateFields.push(`estimated_hours = $${paramIndex++}`);
      updateValues.push(estimated_hours);
    }
    if (estimated_days !== undefined) {
      updateFields.push(`estimated_days = $${paramIndex++}`);
      updateValues.push(estimated_days);
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
      UPDATE proposals 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Taklif muvaffaqiyatli yangilandi!',
      data: {
        proposal: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklifni yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * DELETE /proposals/:id
 * Withdraw proposal (only author can withdraw)
 */
const withdrawProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancerlar taklifni bekor qilishi mumkin.'
      });
    }

    // Check if proposal exists and user is author
    const proposalCheck = await pool.query(
      'SELECT freelancer_id, status FROM proposals WHERE id = $1',
      [id]
    );

    if (proposalCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    if (proposalCheck.rows[0].freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu taklifning muallifi emassiz.'
      });
    }

    // Update status to withdrawn
    await pool.query(
      'UPDATE proposals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['withdrawn', id]
    );

    res.json({
      success: true,
      message: 'Taklif bekor qilindi!'
    });
  } catch (error) {
    console.error('Withdraw proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklifni bekor qilishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /proposals/:id/accept
 * Accept proposal (only project owner can accept)
 */
const acceptProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar taklifni qabul qilishi mumkin.'
      });
    }

    // Get proposal with project info
    const proposalResult = await pool.query(
      `SELECT 
        p.*,
        pr.client_id,
        pr.status as project_status
      FROM proposals p
      JOIN jobs j ON p.job_id = j.id
      WHERE p.id = $1`,
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    const proposal = proposalResult.rows[0];

    if (proposal.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu loyihaning egasi emassiz.'
      });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "pending" statusdagi takliflarni qabul qilish mumkin.'
      });
    }

    if (proposal.project_status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "open" statusdagi loyihalarga taklif qabul qilish mumkin.'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update proposal status
      await pool.query(
        'UPDATE proposals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['accepted', id]
      );

      // Reject all other proposals for this project
      await pool.query(
        'UPDATE proposals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2 AND id != $3',
        ['rejected', proposal.job_id, id]
      );

      // Update project status
      await pool.query(
        'UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['in_progress', proposal.job_id]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Taklif qabul qilindi! Loyiha "in_progress" statusiga o\'tdi.'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Accept proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklifni qabul qilishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /proposals/:id/reject
 * Reject proposal (only project owner can reject)
 */
const rejectProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar taklifni rad etishi mumkin.'
      });
    }

    // Get proposal with project info
    const proposalResult = await pool.query(
      `SELECT 
        p.*,
        pr.client_id
      FROM proposals p
      JOIN jobs j ON p.job_id = j.id
      WHERE p.id = $1`,
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    const proposal = proposalResult.rows[0];

    if (proposal.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu loyihaning egasi emassiz.'
      });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "pending" statusdagi takliflarni rad etish mumkin.'
      });
    }

    // Update proposal status
    await pool.query(
      'UPDATE proposals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['rejected', id]
    );

    res.json({
      success: true,
      message: 'Taklif rad etildi!'
    });
  } catch (error) {
    console.error('Reject proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Taklifni rad etishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /proposals/:id/ai-writer
 * AI proposal writer helper
 */
const aiWriter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if proposal exists and user is author
    const proposalResult = await pool.query(
      'SELECT job_id, freelancer_id FROM proposals WHERE id = $1',
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    if (proposalResult.rows[0].freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu taklifning muallifi emassiz.'
      });
    }

    // Get project details
    const projectResult = await pool.query(
      'SELECT title, description, required_skills as skills FROM jobs WHERE id = $1',
      [proposalResult.rows[0].job_id]
    );

    // TODO: Integrate with AI service
    const improvedCoverLetter = `Yaxshilangan taklif matni...`;

    res.json({
      success: true,
      data: {
        improved_cover_letter: improvedCoverLetter
      }
    });
  } catch (error) {
    console.error('AI writer error:', error);
    res.status(500).json({
      success: false,
      message: 'AI yozuvchi xatosi.',
      error: error.message
    });
  }
};

/**
 * POST /proposals/:id/score
 * AI proposal scoring
 */
const aiScore = async (req, res) => {
  try {
    const { id } = req.params;

    const proposalResult = await pool.query(
      'SELECT cover_letter FROM proposals WHERE id = $1',
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taklif topilmadi.'
      });
    }

    // Simple scoring (can be enhanced with ML)
    const coverLetter = proposalResult.rows[0].cover_letter;
    let score = 50;

    if (coverLetter.length > 100) score += 20;
    if (coverLetter.length > 200) score += 10;
    if (coverLetter.toLowerCase().includes('tajriba')) score += 10;
    if (coverLetter.toLowerCase().includes('ko\'nikma')) score += 10;

    score = Math.min(100, score);

    res.json({
      success: true,
      data: {
        proposal_id: id,
        score,
        feedback: score > 70 ? 'Yaxshi taklif' : 'Yaxshilash tavsiya etiladi'
      }
    });
  } catch (error) {
    console.error('AI score error:', error);
    res.status(500).json({
      success: false,
      message: 'Baholashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  createProposal,
  getProposals,
  getProposalById,
  getMyProposals,
  getProjectProposals,
  updateProposal,
  withdrawProposal,
  acceptProposal,
  rejectProposal,
  aiWriter,
  aiScore
};


