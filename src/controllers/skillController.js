const pool = require('../db/pool');

const getSkills = async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = `
      SELECT name 
      FROM skills 
    `;
    const params = [];

    if (search && search.trim() !== '') {
      query += ` WHERE name ILIKE $1 `;
      params.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY usage_count DESC, name ASC LIMIT 15`;

    const result = await pool.query(query, params);
    
    // Return array of strings
    const skills = result.rows.map(row => row.name);
    
    res.json({
      success: true,
      skills
    });
  } catch (err) {
    console.error('Error fetching skills:', err);
    res.status(500).json({ success: false, message: 'Server xatosi', skills: [] });
  }
};

/**
 * Kategoriyalar bo'yicha freelancerlar soni va top skillslar
 * GET /api/skills/categories
 */
const getCategories = async (req, res) => {
  try {
    // Top skills usage_count bo'yicha
    const result = await pool.query(`
      SELECT 
        s.name,
        COALESCE(s.usage_count, 0) AS usage_count,
        COALESCE(s.category, 'other') AS category,
        COUNT(DISTINCT fp.user_id) AS freelancer_count
      FROM skills s
      LEFT JOIN LATERAL (
        SELECT user_id FROM freelancer_profiles 
        WHERE skills::text ILIKE '%' || s.name || '%'
        LIMIT 100
      ) fp ON true
      GROUP BY s.id, s.name, s.usage_count, s.category
      ORDER BY s.usage_count DESC, freelancer_count DESC
      LIMIT 50
    `);

    res.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, message: 'Server xatosi', categories: [] });
  }
};

module.exports = {
  getSkills,
  getCategories
};
