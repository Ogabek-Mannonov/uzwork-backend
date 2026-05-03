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
        COALESCE(u.avatar_url, '') AS avatar_url,
        COALESCE(f.title, 'Freelancer') AS title,
        COALESCE(f.hourly_rate, 0.00) AS hourly_rate,
        COALESCE(f.skills, '[]'::jsonb) AS skills,
        COALESCE(f.rating, 0.0) AS rating,
        COALESCE(f.completed_jobs, 0) AS completed_jobs,
        COALESCE(f.location, '') AS location
      FROM users u
      LEFT JOIN freelancer_profiles f ON u.id = f.user_id
      WHERE u.role = 'freelancer'
      ORDER BY f.rating DESC NULLS LAST, f.completed_jobs DESC NULLS LAST
      LIMIT 12
    `);

    // ==========================
    // Latest reviews
    // ==========================
    const reviews = await pool.query(`
      SELECT
        COALESCE(r.rating, 5) AS rating,
        COALESCE(r.comment, 'Great work!') AS comment,
        CONCAT(u.first_name,' ',u.last_name) AS full_name,
        COALESCE(u.avatar_url, '') AS avatar_url
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 6
    `);

    // ==========================
    // Popular skills (with usage count)
    // ==========================
    const skills = await pool.query(`
      SELECT id, name, COALESCE(usage_count, 0) AS usage_count
      FROM skills
      ORDER BY usage_count DESC, name ASC
      LIMIT 20
    `);

    // ==========================
    // Platform stats (real counts)
    // ==========================
    const [usersCount, jobsCount, contractsCount, freelancerCount, clientCount] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE is_active = true`),
      pool.query(`SELECT COUNT(*) FROM jobs`),
      pool.query(`SELECT COUNT(*) FROM contracts WHERE status = 'completed'`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'freelancer' AND is_active = true`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'client' AND is_active = true`),
    ]);

    // ==========================
    // Featured jobs (latest open)
    // ==========================
    const featuredJobs = await pool.query(`
      SELECT
        j.id,
        j.title,
        j.description,
        COALESCE(j.budget_min, j.budget_amount, 0) AS budget_min,
        COALESCE(j.budget_max, j.budget_amount, 0) AS budget_max,
        COALESCE(j.budget_amount, 0) AS budget_amount,
        j.budget_type,
        j.currency,
        j.experience_level,
        j.project_duration,
        j.created_at,
        CONCAT(u.first_name, ' ', u.last_name) AS client_name,
        COALESCE(u.avatar_url, '') AS client_avatar,
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS skills
      FROM jobs j
      LEFT JOIN users u ON j.client_id = u.id
      LEFT JOIN job_skills js ON j.id = js.job_id
      LEFT JOIN skills s ON js.skill_id = s.id
      WHERE j.status = 'open'
        AND (j.visibility = 'public' OR j.visibility IS NULL)
      GROUP BY j.id, u.first_name, u.last_name, u.avatar_url
      ORDER BY j.created_at DESC
      LIMIT 6
    `);

    // ==========================
    // Response JSON
    // ==========================
    res.json({
      success: true,
      freelancers: freelancers.rows,
      reviews: reviews.rows,
      skills: skills.rows,
      featured_jobs: featuredJobs.rows,
      stats: {
        users: parseInt(usersCount.rows[0].count, 10),
        jobs: parseInt(jobsCount.rows[0].count, 10),
        contracts: parseInt(contractsCount.rows[0].count, 10),
        freelancers: parseInt(freelancerCount.rows[0].count, 10),
        clients: parseInt(clientCount.rows[0].count, 10),
      }
    });

  } catch (err) {
    console.error("Landing data error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};