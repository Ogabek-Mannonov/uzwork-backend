require('dotenv').config();
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:990338613ooga@my-postgres-db.cz2qeew0w1dm.eu-north-1.rds.amazonaws.com:5432/aws',
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    const user = await pool.query("SELECT * FROM users WHERE email='maruf@gmail.com'");
    if (!user.rows[0]) return console.log("User not found");
    const u = user.rows[0];
    const token = jwt.sign(
      { id: u.id, role: u.role, email: u.email },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: "10h" }
    );
    
    const res = await fetch("http://localhost:3000/profiles/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({
        title: "Test Title", bio: "Test Bio", hourly_rate: 45, location: "Tashkent", skills: ["React", "Node.js"]
      })
    });
    const data = await res.json();
    console.log("PUT RESPONSE:", res.status, data);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
runTest();
