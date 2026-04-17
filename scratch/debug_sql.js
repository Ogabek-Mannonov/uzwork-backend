const pool = require('./src/db/pool');

async function test() {
  try {
    const params = [];
    const where = "WHERE u.role ILIKE 'freelancer' AND (u.deleted_at IS NULL)";
    const l = 20;
    const offset = 0;
    const i = 1;

    console.log('Testing Count Query...');
    const countR = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM users u
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      ${where}
    `, params);
    console.log('Count:', countR.rows[0].c);

    console.log('Testing List Query...');
    const listR = await pool.query(`
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
      ${where}
      ORDER BY COALESCE(fp.rating, 0) DESC, u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [l, offset]);
    console.log('Results found:', listR.rows.length);

  } catch (err) {
    console.error('SQL ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
