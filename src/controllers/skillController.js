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

module.exports = {
  getSkills
};
