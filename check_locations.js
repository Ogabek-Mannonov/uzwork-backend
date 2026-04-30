const pool = require('./src/db/pool');

async function checkLocations() {
  try {
    const res = await pool.query(`
      SELECT location, COUNT(*) 
      FROM freelancer_profiles 
      GROUP BY location 
      ORDER BY count DESC
    `);
    console.log('--- BAZADAGI JOYLAShUVLAR ---');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Xato:', err.message);
    process.exit(1);
  }
}

checkLocations();
