// src/jobs/autoRatingJob.js
const pool = require("../db/pool");
const { updateUserRating } = require("../controllers/reviewController");

/**
 * Silent Completion Background Job
 * Checks contracts completed > 14 days ago. 
 * If no review was submitted, creates a "Neutral-Positive" (4.0/5.0) rating automatically, 
 * adding +0.5 to JSS for the freelancer.
 */
async function runAutoRatingJob() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get contracts completed more than 14 days ago
    const contractsRes = await client.query(
      `SELECT id, freelancer_id, client_id, completed_at
       FROM contracts
       WHERE status = 'completed'
         AND completed_at < NOW() - INTERVAL '14 days'`
    );

    let processedCount = 0;

    for (const contract of contractsRes.rows) {
      const { id: contractId, freelancer_id: freelancerId, client_id: clientId } = contract;

      // 1. Check client -> freelancer rating
      const clientRatingCheck = await client.query(
        'SELECT id FROM ratings WHERE contract_id = $1 AND from_user_id = $2 AND to_user_id = $3',
        [contractId, clientId, freelancerId]
      );

      if (clientRatingCheck.rows.length === 0) {
        // Create automatic 4-star rating for freelancer
        await client.query(
          `INSERT INTO ratings (
            contract_id, from_user_id, to_user_id, 
            score_quality, score_timeliness, score_communication,
            comment, is_automatic
          ) VALUES ($1, $2, $3, 4, 4, 4, 'Avtomatik baholash (14 kun ichida munosabat bildirilmagan)', TRUE)
          ON CONFLICT (contract_id, from_user_id) DO NOTHING`,
          [contractId, clientId, freelancerId]
        );

        // Add +0.5 to freelancer's JSS (Job Success Score)
        await client.query(
          `UPDATE freelancer_profiles 
           SET jss = LEAST(100.00, COALESCE(jss, 100.00) + 0.5) 
           WHERE user_id = $1`,
          [freelancerId]
        );

        // Recalculate freelancer rating profile
        await updateUserRating(freelancerId);
        processedCount++;
      }

      // 2. Check freelancer -> client rating
      const freelancerRatingCheck = await client.query(
        'SELECT id FROM ratings WHERE contract_id = $1 AND from_user_id = $2 AND to_user_id = $3',
        [contractId, freelancerId, clientId]
      );

      if (freelancerRatingCheck.rows.length === 0) {
        // Create automatic 4-star rating for client
        await client.query(
          `INSERT INTO ratings (
            contract_id, from_user_id, to_user_id, 
            score_payment, score_clarity,
            comment, is_automatic
          ) VALUES ($1, $2, $3, 4, 4, 'Avtomatik baholash (14 kun ichida munosabat bildirilmagan)', TRUE)
          ON CONFLICT (contract_id, from_user_id) DO NOTHING`,
          [contractId, freelancerId, clientId]
        );

        // Recalculate client rating profile
        await updateUserRating(clientId);
        processedCount++;
      }
    }

    await client.query("COMMIT");
    return { processed: processedCount };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("autoRatingJob error:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { runAutoRatingJob };
