const pool = require("../db/pool");

exports.getLandingData = async (req, res) => {
  try {
    // ==========================
    // Top freelancers
    // ==========================
    const freelancers = await pool.query(`
      SELECT
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        COALESCE(u.avatar_url, 'https://via.placeholder.com/150') AS avatar_url,
        COALESCE(f.title, 'Freelancer') AS title,
        COALESCE(f.hourly_rate, 0.00) AS hourly_rate,
        COALESCE(f.skills, '[]'::jsonb) AS skills,
        COALESCE(f.rating, 0.0) AS rating,
        COALESCE(f.completed_jobs, 0) AS completed_jobs
      FROM users u
      LEFT JOIN freelancer_profiles f
      ON u.id = f.user_id
      WHERE u.role = 'freelancer'
      ORDER BY f.rating DESC NULLS LAST, f.hourly_rate DESC NULLS LAST
      LIMIT 6
    `);

    // ==========================
    // Latest reviews
    // ==========================
    const reviews = await pool.query(`
      SELECT
        COALESCE(r.rating, 5) AS rating,
        COALESCE(r.comment, 'Great work!') AS comment,
        CONCAT(u.first_name,' ',u.last_name) AS full_name
      FROM reviews r
      JOIN users u
      ON r.reviewer_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 6
    `);

    // ==========================
    // Popular skills
    // ==========================
    const skills = await pool.query(`
      SELECT id, name
      FROM skills
      ORDER BY name ASC
      LIMIT 10
    `);

    // ==========================
    // Platform stats
    // ==========================
    const usersCount = await pool.query(`SELECT COUNT(*) FROM users WHERE role='freelancer' OR role='client'`);
    const jobsCount = await pool.query(`SELECT COUNT(*) FROM jobs`);
    const contractsCount = await pool.query(`SELECT COUNT(*) FROM contracts`);

    // ==========================
    // Featured jobs (limit 6)
    // ==========================
    const featuredJobs = await pool.query(`
      SELECT
        j.id,
        j.title,
        j.description,
        j.budget_min,
        j.budget_max,
        j.currency,
        j.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name
            )
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS skills
      FROM jobs j
      LEFT JOIN job_skills js ON j.id = js.job_id
      LEFT JOIN skills s ON js.skill_id = s.id
      WHERE j.status = 'open' AND j.visibility = 'public'
      GROUP BY j.id
      ORDER BY j.created_at DESC
      LIMIT 6
    `);

    // ==========================
    // Response JSON
    // ==========================
    res.json({
      freelancers: freelancers.rows,
      reviews: reviews.rows,
      skills: skills.rows,
      featured_jobs: featuredJobs.rows,
      stats: {
        users: parseInt(usersCount.rows[0].count, 10),
        jobs: parseInt(jobsCount.rows[0].count, 10),
        contracts: parseInt(contractsCount.rows[0].count, 10)
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};