require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:990338613ooga@my-postgres-db.cz2qeew0w1dm.eu-north-1.rds.amazonaws.com:5432/aws',
  ssl: false
});

async function checkCols() {
  try {
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='freelancer_profiles'
    `);
    console.log("FREELANCER COLS:", res.rows.map(r => r.column_name));
    
    const cres = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='client_profiles'
    `);
    console.log("CLIENT COLS:", cres.rows.map(r => r.column_name));
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    pool.end();
  }
}
checkCols();
