const pool = require('./src/db/pool');

async function test() {
  try {
    const userId = '355df18d-edc3-42fc-9ab8-a23819aec149'; // From logs
    const limit = 200;
    const offset = 0;
    
    // Testing getMyProposals logic (freelancer case)
    const where = ["j.deleted_at IS NULL", "p.freelancer_id = $1"];
    const params = [userId];
    let i = 2;
    const whereClause = `WHERE ${where.join(" AND ")}`;
    
    const listQuery = `
      SELECT 
        p.*,
        j.id as job_id,
        j.title as job_title,
        j.status as job_status,
        j.client_id as job_client_id,
        u_client.first_name as client_first_name,
        u_client.last_name as client_last_name,
        COALESCE(u_client.avatar_url, cp.avatar_url) as client_avatar,
        u_freelancer.first_name as freelancer_first_name,
        u_freelancer.last_name as freelancer_last_name,
        COALESCE(u_freelancer.avatar_url, f.avatar_url) as freelancer_avatar,
        f.title as freelancer_title
      FROM proposals p
      JOIN jobs j ON j.id = p.job_id
      JOIN users u_client ON u_client.id = j.client_id
      LEFT JOIN client_profiles cp ON cp.user_id = u_client.id
      JOIN users u_freelancer ON u_freelancer.id = p.freelancer_id
      LEFT JOIN freelancer_profiles f ON f.user_id = u_freelancer.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;
    
    console.log("Query:", listQuery);
    console.log("Params:", [userId, limit, offset]);
    
    const res = await pool.query(listQuery, [userId, limit, offset]);
    console.log("Success! Found rows:", res.rowCount);
  } catch (err) {
    console.error("FAIL!", err);
  } finally {
    process.exit();
  }
}

test();
