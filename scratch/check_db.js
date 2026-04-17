const pool = require('./src/db/pool');

async function check() {
  try {
    const res = await pool.query(`
      SELECT u.id, u.first_name, u.role, fp.location, fp.hourly_rate 
      FROM users u 
      LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id 
      WHERE u.role = 'freelancer'
    `);
    console.log('Freelancers in DB:', res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
