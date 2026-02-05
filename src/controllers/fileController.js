// src/controllers/fileController.js
const pool = require("../db/pool");

// uuid check
const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const normalizeStr = (v) => (typeof v === "string" ? v.trim() : v);

const ALLOWED_RELATED_TYPES = new Set([
  "portfolio",
  "proposal",
  "contract",
  "job",
  "message",
  "dispute",
  "other",
]);

/**
 * POST /files/upload
 * Body: { file_name, file_url, file_type?, file_size?, related_type?, related_id? }
 */
const uploadFile = async (req, res) => {
  try {
    const userId = req.user?.id;

    const file_name = normalizeStr(req.body?.file_name);
    const file_url = normalizeStr(req.body?.file_url);
    const file_type = normalizeStr(req.body?.file_type);
    const related_type = normalizeStr(req.body?.related_type);
    const related_id = normalizeStr(req.body?.related_id);

    let file_size = req.body?.file_size;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Auth kerak." });
    }

    if (!file_name || !file_url) {
      return res.status(400).json({
        success: false,
        message: "file_name va file_url majburiy.",
      });
    }

    // size normalize
    if (file_size !== undefined && file_size !== null && file_size !== "") {
      const n = Number(file_size);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({
          success: false,
          message: "file_size noto‘g‘ri (musbat son bo‘lishi kerak).",
        });
      }
      file_size = Math.round(n);
    } else {
      file_size = null;
    }

    // related_type validation
    let finalRelatedType = null;
    if (related_type) {
      if (!ALLOWED_RELATED_TYPES.has(related_type)) {
        return res.status(400).json({
          success: false,
          message:
            "related_type noto‘g‘ri. Ruxsat: portfolio, proposal, contract, job, message, dispute, other",
        });
      }
      finalRelatedType = related_type;
    }

    // related_id validation
    let finalRelatedId = null;
    if (related_id) {
      if (!isUuid(related_id)) {
        return res.status(400).json({
          success: false,
          message: "related_id UUID formatda bo‘lishi kerak.",
        });
      }
      finalRelatedId = related_id;
    }

    // agar related_id bor-u related_type yo‘q bo‘lsa, bu chalkash bo‘lmasin
    if (finalRelatedId && !finalRelatedType) {
      return res.status(400).json({
        success: false,
        message: "related_id yuborsangiz related_type ham yuboring.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO file_uploads (
        user_id, file_name, file_url, file_type, file_size, related_type, related_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        userId,
        file_name,
        file_url,
        file_type || null,
        file_size,
        finalRelatedType,
        finalRelatedId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Fayl saqlandi!",
      data: { file: result.rows[0] },
    });
  } catch (error) {
    console.error("Upload file error:", error);
    return res.status(500).json({
      success: false,
      message: "Fayl yuklashda xato yuz berdi.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /files
 * Query: related_type?, related_id?, page?, limit?
 * Default: o'zining fayllari
 */
const getFiles = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Auth kerak." });
    }

    const related_type = normalizeStr(req.query?.related_type);
    const related_id = normalizeStr(req.query?.related_id);

    const page = Math.max(parseInt(req.query?.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    let where = `WHERE user_id = $1`;
    const params = [userId];
    let i = 2;

    if (related_type) {
      if (!ALLOWED_RELATED_TYPES.has(related_type)) {
        return res.status(400).json({
          success: false,
          message:
            "related_type noto‘g‘ri. Ruxsat: portfolio, proposal, contract, job, message, dispute, other",
        });
      }
      where += ` AND related_type = $${i++}`;
      params.push(related_type);
    }

    if (related_id) {
      if (!isUuid(related_id)) {
        return res.status(400).json({
          success: false,
          message: "related_id UUID formatda bo‘lishi kerak.",
        });
      }
      where += ` AND related_id = $${i++}`;
      params.push(related_id);
    }

    // total count
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS c FROM file_uploads ${where}`,
      params
    );
    const total = countRes.rows[0]?.c || 0;

    const listRes = await pool.query(
      `
      SELECT *
      FROM file_uploads
      ${where}
      ORDER BY created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: {
        files: listRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get files error:", error);
    return res.status(500).json({
      success: false,
      message: "Fayllarni olishda xato yuz berdi.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  uploadFile,
  getFiles,
};
