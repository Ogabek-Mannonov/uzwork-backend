// src/controllers/fileController.js
const pool = require('../db/pool');

/**
 * POST /files/upload
 * Upload file (portfolio, proposal, contract, etc.)
 */
const uploadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { file_name, file_url, file_type, file_size, related_type, related_id } = req.body;

    if (!file_name || !file_url) {
      return res.status(400).json({
        success: false,
        message: 'File_name va file_url kerak.'
      });
    }

    // TODO: In production, use multer or similar for actual file upload
    // For now, we just store the file metadata

    const result = await pool.query(
      `INSERT INTO file_uploads (
        user_id, file_name, file_url, file_type, file_size, related_type, related_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [userId, file_name, file_url, file_type || null, file_size || null, related_type || null, related_id || null]
    );

    res.status(201).json({
      success: true,
      message: 'Fayl yuklandi!',
      data: {
        file: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Fayl yuklashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /files
 * Get user's uploaded files
 */
const getFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { related_type, related_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (related_type) {
      whereClause += ` AND related_type = $${paramIndex++}`;
      queryParams.push(related_type);
    }

    if (related_id) {
      whereClause += ` AND related_id = $${paramIndex++}`;
      queryParams.push(related_id);
    }

    const result = await pool.query(
      `SELECT *
       FROM file_uploads
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        files: result.rows
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Fayllarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  uploadFile,
  getFiles
};


