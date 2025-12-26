// src/controllers/contractController.js
const pool = require('../db/pool');

/**
 * POST /contracts
 * Create a contract from accepted proposal
 */
const createContract = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Faqat clientlar shartnoma yaratishi mumkin.'
      });
    }

    const { proposal_id } = req.body;

    if (!proposal_id) {
      return res.status(400).json({
        success: false,
        message: 'Proposal_id kerak.'
      });
    }

    // Get proposal with project info
    const proposalResult = await pool.query(
      `SELECT 
        p.*,
        pr.client_id,
        pr.budget_type,
        pr.status as project_status
      FROM proposals p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = $1`,
      [proposal_id]
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

    if (proposal.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "accepted" statusdagi takliflar uchun shartnoma yaratish mumkin.'
      });
    }

    // Check if contract already exists
    const existingContract = await pool.query(
      'SELECT id FROM contracts WHERE proposal_id = $1',
      [proposal_id]
    );

    if (existingContract.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bu taklif uchun shartnoma allaqachon yaratilgan.'
      });
    }

    // Create contract
    const contractType = proposal.budget_type;
    const totalAmount = contractType === 'fixed' 
      ? proposal.proposed_amount 
      : proposal.proposed_rate * proposal.estimated_hours;
    const hourlyRate = contractType === 'hourly' ? proposal.proposed_rate : null;

    const result = await pool.query(
      `INSERT INTO contracts (
        project_id, client_id, freelancer_id, proposal_id,
        contract_type, total_amount, hourly_rate, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        proposal.project_id,
        proposal.client_id,
        proposal.freelancer_id,
        proposal_id,
        contractType,
        totalAmount,
        hourlyRate,
        'active'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Shartnoma muvaffaqiyatli yaratildi!',
      data: {
        contract: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Shartnoma yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /contracts
 * Get all contracts with filters
 */
const getContracts = async (req, res) => {
  try {
    const {
      project_id,
      client_id,
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

    if (project_id) {
      whereConditions.push(`c.project_id = $${paramIndex++}`);
      queryParams.push(project_id);
    }

    if (client_id) {
      whereConditions.push(`c.client_id = $${paramIndex++}`);
      queryParams.push(client_id);
    }

    if (freelancer_id) {
      whereConditions.push(`c.freelancer_id = $${paramIndex++}`);
      queryParams.push(freelancer_id);
    }

    if (status) {
      whereConditions.push(`c.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM contracts c ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get contracts with user and project info
    const contractsQuery = `
      SELECT 
        c.*,
        u_client.first_name as client_first_name,
        u_client.last_name as client_last_name,
        u_freelancer.first_name as freelancer_first_name,
        u_freelancer.last_name as freelancer_last_name,
        pr.title as project_title
      FROM contracts c
      JOIN users u_client ON c.client_id = u_client.id
      JOIN users u_freelancer ON c.freelancer_id = u_freelancer.id
      JOIN projects pr ON c.project_id = pr.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const contractsResult = await pool.query(contractsQuery, queryParams);

    res.json({
      success: true,
      data: {
        contracts: contractsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'Shartnomalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /contracts/:id
 * Get contract by ID
 */
const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        c.*,
        u_client.first_name as client_first_name,
        u_client.last_name as client_last_name,
        u_client.email as client_email,
        u_freelancer.first_name as freelancer_first_name,
        u_freelancer.last_name as freelancer_last_name,
        u_freelancer.email as freelancer_email,
        pr.title as project_title,
        pr.description as project_description
      FROM contracts c
      JOIN users u_client ON c.client_id = u_client.id
      JOIN users u_freelancer ON c.freelancer_id = u_freelancer.id
      JOIN projects pr ON c.project_id = pr.id
      WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shartnoma topilmadi.'
      });
    }

    const contract = result.rows[0];

    // Check if user is part of this contract
    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu shartnomaning qismi emassiz.'
      });
    }

    res.json({
      success: true,
      data: {
        contract: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get contract by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Shartnomani olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /contracts/my
 * Get current user's contracts
 */
const getMyContracts = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = userRole === 'client' 
      ? 'WHERE c.client_id = $1'
      : 'WHERE c.freelancer_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND c.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM contracts c ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get contracts
    const contractsQuery = `
      SELECT 
        c.*,
        u_client.first_name as client_first_name,
        u_client.last_name as client_last_name,
        u_freelancer.first_name as freelancer_first_name,
        u_freelancer.last_name as freelancer_last_name,
        pr.title as project_title
      FROM contracts c
      JOIN users u_client ON c.client_id = u_client.id
      JOIN users u_freelancer ON c.freelancer_id = u_freelancer.id
      JOIN projects pr ON c.project_id = pr.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const contractsResult = await pool.query(contractsQuery, queryParams);

    res.json({
      success: true,
      data: {
        contracts: contractsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get my contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'Shartnomalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /contracts/:id
 * Update contract (milestones, dates, etc.)
 */
const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if contract exists
    const contractCheck = await pool.query(
      'SELECT client_id, freelancer_id, status FROM contracts WHERE id = $1',
      [id]
    );

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shartnoma topilmadi.'
      });
    }

    const contract = contractCheck.rows[0];

    // Check if user is part of contract
    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu shartnomaning qismi emassiz.'
      });
    }

    if (contract.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "active" statusdagi shartnomalarni yangilash mumkin.'
      });
    }

    const {
      start_date,
      end_date,
      milestones
    } = req.body;

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex++}`);
      updateValues.push(start_date);
    }
    if (end_date !== undefined) {
      updateFields.push(`end_date = $${paramIndex++}`);
      updateValues.push(end_date);
    }
    if (milestones !== undefined) {
      updateFields.push(`milestones = $${paramIndex++}`);
      updateValues.push(JSON.stringify(milestones));
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
      UPDATE contracts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Shartnoma muvaffaqiyatli yangilandi!',
      data: {
        contract: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Shartnomani yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /contracts/:id/complete
 * Mark contract as completed
 */
const completeContract = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get contract
    const contractResult = await pool.query(
      'SELECT client_id, freelancer_id, status FROM contracts WHERE id = $1',
      [id]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shartnoma topilmadi.'
      });
    }

    const contract = contractResult.rows[0];

    // Only client can complete contract
    if (userRole !== 'client' || contract.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Faqat client shartnomani yakunlashi mumkin.'
      });
    }

    if (contract.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "active" statusdagi shartnomalarni yakunlash mumkin.'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update contract status
      await pool.query(
        'UPDATE contracts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', id]
      );

      // Update project status
      await pool.query(
        `UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = (SELECT project_id FROM contracts WHERE id = $2)`,
        ['completed', id]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Shartnoma yakunlandi!'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Complete contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Shartnomani yakunlashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /contracts/:id/cancel
 * Cancel contract
 */
const cancelContract = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get contract
    const contractResult = await pool.query(
      'SELECT client_id, freelancer_id, status FROM contracts WHERE id = $1',
      [id]
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

    if (contract.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Faqat "active" statusdagi shartnomalarni bekor qilish mumkin.'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update contract status
      await pool.query(
        'UPDATE contracts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', id]
      );

      // Update project status back to open
      await pool.query(
        `UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = (SELECT project_id FROM contracts WHERE id = $2)`,
        ['open', id]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Shartnoma bekor qilindi!'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Cancel contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Shartnomani bekor qilishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * PUT /contracts/:id/milestone
 * Update milestone status
 */
const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { milestone_id, status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!milestone_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Milestone_id va status kerak.'
      });
    }

    // Check milestone exists
    const milestoneResult = await pool.query(
      'SELECT * FROM contract_milestones WHERE id = $1 AND contract_id = $2',
      [milestone_id, id]
    );

    if (milestoneResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Milestone topilmadi.'
      });
    }

    // Check contract
    const contractResult = await pool.query(
      'SELECT client_id, freelancer_id FROM contracts WHERE id = $1',
      [id]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shartnoma topilmadi.'
      });
    }

    const contract = contractResult.rows[0];

    // Freelancer can deliver, client can accept/reject
    if (status === 'delivered' && contract.freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancer deliver qilishi mumkin.'
      });
    }

    if (['accepted', 'rejected'].includes(status) && contract.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Faqat client accept/reject qilishi mumkin.'
      });
    }

    const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const updateValues = [status];
    let paramIndex = 2;

    if (status === 'delivered') {
      updateFields.push('delivered_at = CURRENT_TIMESTAMP');
    }

    if (status === 'accepted') {
      updateFields.push('accepted_at = CURRENT_TIMESTAMP');
    }

    updateValues.push(milestone_id, id);
    paramIndex += 2;

    await pool.query(
      `UPDATE contract_milestones 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex - 1} AND contract_id = $${paramIndex}`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Milestone yangilandi!'
    });
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({
      success: false,
      message: 'Milestoneni yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /contracts/:id/dispute
 * Create dispute
 */
const createDispute = async (req, res) => {
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

    // Check contract
    const contractResult = await pool.query(
      'SELECT client_id, freelancer_id, status FROM contracts WHERE id = $1',
      [id]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shartnoma topilmadi.'
      });
    }

    const contract = contractResult.rows[0];

    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu shartnomaning qismi emassiz.'
      });
    }

    // Check if dispute already exists
    const existingDispute = await pool.query(
      'SELECT id FROM disputes WHERE contract_id = $1 AND status = $2',
      [id, 'open']
    );

    if (existingDispute.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bu shartnoma uchun nizo allaqachon ochilgan.'
      });
    }

    const result = await pool.query(
      `INSERT INTO disputes (
        contract_id, initiator_id, reason, description
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [id, userId, reason, description]
    );

    // Update contract status
    await pool.query(
      'UPDATE contracts SET status = $1 WHERE id = $2',
      ['disputed', id]
    );

    res.status(201).json({
      success: true,
      message: 'Nizo ochildi!',
      data: {
        dispute: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Nizo ochishda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  createContract,
  getContracts,
  getContractById,
  getMyContracts,
  updateContract,
  completeContract,
  cancelContract,
  updateMilestone,
  createDispute
};


