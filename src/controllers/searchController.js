// src/controllers/searchController.js
const pool = require('../db/pool');

/**
 * GET /search
 * Global search (projects, freelancers, clients)
 */
const globalSearch = async (req, res) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Qidiruv so\'zi kamida 2 belgi bo\'lishi kerak.'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = `%${q.trim()}%`;

    let results = {
      projects: [],
      freelancers: [],
      clients: []
    };

    // Search projects
    if (!type || type === 'projects' || type === 'all') {
      const projectsQuery = `
        SELECT 
          p.id,
          p.title,
          p.description,
          p.category,
          p.budget_type,
          p.budget_min,
          p.budget_max,
          p.status,
          p.created_at,
          u.first_name as client_first_name,
          u.last_name as client_last_name
        FROM projects p
        JOIN users u ON p.client_id = u.id
        WHERE (p.title ILIKE $1 OR p.description ILIKE $1 OR p.category ILIKE $1)
          AND p.status = 'open'
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const projectsResult = await pool.query(projectsQuery, [searchTerm, parseInt(limit), offset]);
      results.projects = projectsResult.rows;
    }

    // Search freelancers
    if (!type || type === 'freelancers' || type === 'all') {
      const freelancersQuery = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          up.bio,
          up.location,
          up.skills,
          up.hourly_rate,
          (
            SELECT AVG(
              COALESCE(
                (score_quality + score_timeliness + score_communication) / 3.0,
                (score_payment + score_clarity) / 2.0
              )
            )::numeric(10,2)
            FROM ratings
            WHERE to_user_id = u.id
          ) as average_rating
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.role = 'freelancer'
          AND (
            u.first_name ILIKE $1 
            OR u.last_name ILIKE $1 
            OR up.bio ILIKE $1 
            OR up.location ILIKE $1
            OR EXISTS (SELECT 1 FROM unnest(up.skills) skill WHERE skill ILIKE $1)
          )
        ORDER BY average_rating DESC NULLS LAST
        LIMIT $2 OFFSET $3
      `;
      const freelancersResult = await pool.query(freelancersQuery, [searchTerm, parseInt(limit), offset]);
      results.freelancers = freelancersResult.rows;
    }

    // Search clients
    if (!type || type === 'clients' || type === 'all') {
      const clientsQuery = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          up.bio,
          up.location,
          (SELECT COUNT(*) FROM projects WHERE client_id = u.id) as total_projects
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.role = 'client'
          AND (
            u.first_name ILIKE $1 
            OR u.last_name ILIKE $1 
            OR up.bio ILIKE $1 
            OR up.location ILIKE $1
          )
        ORDER BY total_projects DESC
        LIMIT $2 OFFSET $3
      `;
      const clientsResult = await pool.query(clientsQuery, [searchTerm, parseInt(limit), offset]);
      results.clients = clientsResult.rows;
    }

    res.json({
      success: true,
      data: {
        query: q,
        results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Qidiruvda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  globalSearch
};

