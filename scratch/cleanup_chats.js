const pool = require('./src/db/pool');

async function cleanEmptyChats() {
  try {
    // Find chats with no messages
    const res = await pool.query(`
      SELECT c.id, c.job_id, c.freelancer_id, j.client_id
      FROM chats c
      JOIN jobs j ON j.id = c.job_id
      LEFT JOIN messages m ON m.chat_id = c.id
      GROUP BY c.id, j.client_id
      HAVING COUNT(m.id) = 0
    `);

    console.log(`Found ${res.rows.length} empty chats.`);
    
    for (const chat of res.rows) {
      // Check if there's another chat between the same pair that HAS messages
      const other = await pool.query(`
        SELECT c.id FROM chats c
        JOIN jobs j ON j.id = c.job_id
        JOIN messages m ON m.chat_id = c.id
        WHERE ((j.client_id = $1 AND c.freelancer_id = $2) OR (j.client_id = $2 AND c.freelancer_id = $1))
          AND c.id != $3
        LIMIT 1
      `, [chat.client_id, chat.freelancer_id, chat.id]);

      if (other.rows.length > 0) {
        console.log(`Deleting empty chat ${chat.id} because a non-empty chat exists for this pair.`);
        await pool.query(`DELETE FROM chats WHERE id = $1`, [chat.id]);
      }
    }
    console.log("Cleanup finished.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

cleanEmptyChats();
