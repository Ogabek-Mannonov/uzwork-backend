/**
 * scripts/backfill_notifications.js
 * 
 * Eski notificationlarda "undefined" so'zi bor yoki title_en/body_en NULL bo'lgan
 * yozuvlarni translations.js dan to'ldirib, data JSON ni ham boyitadi.
 * 
 * Ishlatish: node scripts/backfill_notifications.js
 */

require('dotenv').config({ path: '.env' });
const pool = require('../src/db/pool');
const { getNotificationTranslations } = require('../src/utils/translations');

// Fetch real clientName and jobTitle from DB based on notification type and related_id
async function fetchExtraData(type, storedData) {
  const related_id = storedData.related_id;
  if (!related_id) return {};

  try {
    if (type === 'job_invitation') {
      // related_id = job_id
      const res = await pool.query(`
        SELECT j.title AS job_title, u.first_name, u.last_name
        FROM jobs j
        JOIN users u ON u.id = j.client_id
        WHERE j.id = $1
      `, [related_id]);

      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          jobTitle:   row.job_title,
          clientName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Mijoz'
        };
      }
    }

    if (['proposal_accepted', 'proposal_rejected', 'contract_started',
         'contract_completed', 'contract_cancelled'].includes(type)) {
      if (storedData.related_type === 'contract') {
        const res = await pool.query(`
          SELECT j.title AS job_title FROM contracts c
          JOIN jobs j ON j.id = c.job_id
          WHERE c.id = $1
        `, [related_id]);
        if (res.rows.length > 0) return { jobTitle: res.rows[0].job_title };
      } else if (storedData.related_type === 'project') {
        const res = await pool.query(`SELECT title AS job_title FROM jobs WHERE id = $1`, [related_id]);
        if (res.rows.length > 0) return { jobTitle: res.rows[0].job_title };
      }
    }

    if (type === 'new_job_posted' && storedData.related_type === 'project') {
      const res = await pool.query(`SELECT title AS job_title FROM jobs WHERE id = $1`, [related_id]);
      if (res.rows.length > 0) return { jobTitle: res.rows[0].job_title };
    }
  } catch (e) {
    console.warn(`  ⚠ fetchExtraData error for id=${related_id}:`, e.message);
  }
  return {};
}

async function backfill() {
  console.log('🔄 Backfilling notifications with missing or broken translations...\n');

  // Find ALL notifications that need fixing:
  // 1. title_en/body_en is NULL
  // 2. OR any field contains "undefined"
  // 3. OR job_invitation type doesn't have clientName in data
  const res = await pool.query(`
    SELECT id, type, title, body AS message, data, title_en, body_en, title_ru, body_ru
    FROM notifications
    WHERE 
      title_en IS NULL OR body_en IS NULL OR title_ru IS NULL OR body_ru IS NULL
      OR title_en ILIKE '%undefined%' OR body_en ILIKE '%undefined%'
      OR title_ru ILIKE '%undefined%' OR body_ru ILIKE '%undefined%'
      OR title    ILIKE '%undefined%' OR body    ILIKE '%undefined%'
      OR (type = 'job_invitation' AND (data->>'clientName' IS NULL))
      OR (type IN ('proposal_accepted','proposal_rejected','new_job_posted') AND (data->>'jobTitle' IS NULL))
    ORDER BY created_at DESC
    LIMIT 5000
  `);

  console.log(`Found ${res.rows.length} notifications to fix\n`);

  let updated = 0;
  let skipped = 0;

  for (const notif of res.rows) {
    let storedData = {};
    try {
      storedData = typeof notif.data === 'string' ? JSON.parse(notif.data) : (notif.data || {});
    } catch {}

    // Fetch real data from DB (clientName, jobTitle etc.)
    const extraData = await fetchExtraData(notif.type, storedData);
    const mergedData = { ...storedData, ...extraData };

    const trans = getNotificationTranslations(notif.type, mergedData);

    if (!trans) {
      console.log(`  ⚠ No translation for type: "${notif.type}" (id: ${notif.id})`);
      skipped++;
      continue;
    }

    // Update notification: fix translated fields AND enrich data JSON with fetched values
    const newData = JSON.stringify(mergedData);

    await pool.query(`
      UPDATE notifications
      SET 
        title    = $1,
        body     = $2,
        title_en = $3,
        title_ru = $4,
        body_en  = $5,
        body_ru  = $6,
        data     = $7::jsonb
      WHERE id = $8
    `, [
      trans.title_uz,
      trans.body_uz,
      trans.title_en,
      trans.title_ru,
      trans.body_en,
      trans.body_ru,
      newData,
      notif.id
    ]);

    updated++;
    if (updated % 20 === 0) console.log(`  ✓ Updated ${updated} notifications...`);
  }

  console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);
  await pool.end();
}

backfill().catch(err => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
