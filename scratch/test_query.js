const pool = require('./src/db/pool');

async function test() {
  try {
    const res = await pool.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        u.phone,
        fp.user_id,
        fp.title,
        fp.bio,
        fp.hourly_rate,
        fp.location,
        fp.languages,
        fp.skills,
        fp.portfolio_urls,
        fp.avatar_url,
        fp.cover_url,
        fp.availability_status,
        fp.rating,
        fp.completed_jobs,
        fp.created_at,
        fp.updated_at
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE u.role ILIKE 'freelancer' AND (u.deleted_at IS NULL)
      ORDER BY COALESCE(fp.rating, 0) DESC, u.created_at DESC
      LIMIT 20 OFFSET 0
    `);
    console.log('Success!', res.rows.length, 'freelancers found.');
  } catch (err) {
    console.error('SQL Error:', err.message);
  } finally {
    pool.end();
  }
}

test();
