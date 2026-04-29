// src/controllers/clientController.js
const pool = require("../db/pool");

/**
 * GET /clients
 * Query: company_name, min_rating, page, limit
 */
const getClients = async (req, res) => {
  try {
    const { company_name, min_rating, page = 1, limit = 20 } = req.query;

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (p - 1) * l;

    let where = `WHERE u.role = 'client' AND u.deleted_at IS NULL`;
    const params = [];
    let i = 1;

    if (company_name) {
      where += ` AND cp.company_name ILIKE $${i++}`;
      params.push(`%${company_name}%`);
    }

    if (min_rating) {
      where += ` AND COALESCE(cp.rating, 0) >= $${i++}`;
      params.push(Number(min_rating));
    }

    const countR = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM users u
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
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
        COALESCE(u.avatar_url, cp.avatar_url) as avatar_url,

        cp.company_name,
        cp.company_website,
        cp.company_size,
        cp.rating,
        cp.spent_total,
        cp.created_at,
        cp.updated_at,

        -- agar client haqida reviews bo'lsa
        (SELECT AVG(r.rating)::numeric(10,2) FROM reviews r WHERE r.reviewee_id = u.id) AS average_rating,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewee_id = u.id) AS total_reviews
      FROM users u
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
      ${where}
      ORDER BY COALESCE(cp.rating, 0) DESC, u.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, l, offset]
    );

    return res.json({
      success: true,
      data: {
        clients: listR.rows,
        pagination: {
          page: p,
          limit: l,
          total: countR.rows[0]?.c || 0,
          totalPages: Math.ceil((countR.rows[0]?.c || 0) / l),
        },
      },
    });
  } catch (error) {
    console.error("Get clients error:", error);
    return res.status(500).json({
      success: false,
      message: "Clientlarni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * GET /clients/:id
 */
const getClientById = async (req, res) => {
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
        COALESCE(u.avatar_url, cp.avatar_url) as avatar_url,

        cp.company_name,
        cp.company_website,
        cp.company_size,
        cp.rating,
        cp.spent_total,
        cp.created_at,
        cp.updated_at,

        (SELECT AVG(r.rating)::numeric(10,2) FROM reviews r WHERE r.reviewee_id = u.id) AS average_rating,
        (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewee_id = u.id) AS total_reviews
      FROM users u
      LEFT JOIN client_profiles cp ON cp.user_id = u.id
      WHERE u.id = $1
        AND u.role = 'client'
        AND u.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Client topilmadi." });
    }

    return res.json({ success: true, data: { client: r.rows[0] } });
  } catch (error) {
    console.error("Get client by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Clientni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

/**
 * PUT /clients/me
 * Body: { company_name?, company_website?, company_size? }
 * client_profiles upsert
 */
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = String(req.user.role || "").toLowerCase();

    if (role !== "client") {
      return res.status(403).json({
        success: false,
        message: "Faqat clientlar profilni yangilashi mumkin.",
      });
    }

    const { company_name, company_website, company_size } = req.body;

    const r = await pool.query(
      `
      INSERT INTO client_profiles (user_id, company_name, company_website, company_size, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        company_name = COALESCE(EXCLUDED.company_name, client_profiles.company_name),
        company_website = COALESCE(EXCLUDED.company_website, client_profiles.company_website),
        company_size = COALESCE(EXCLUDED.company_size, client_profiles.company_size),
        updated_at = NOW()
      RETURNING *
      `,
      [userId, company_name ?? null, company_website ?? null, company_size ?? null]
    );

    return res.json({
      success: true,
      message: "Client profili yangilandi!",
      data: { profile: r.rows[0] },
    });
  } catch (error) {
    console.error("Update client profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Profilni yangilashda xato yuz berdi.",
      error: error.message,
    });
  }
};

module.exports = {
  getClients,
  getClientById,
  updateMyProfile,
};
