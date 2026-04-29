require('dotenv').config();
const pool = require('../src/db/pool');
const { getNotificationTranslations } = require('../src/utils/translations');

async function updateOldNotifications() {
  const client = await pool.connect();
  try {
    console.log("Eski bildirishnomalarni tarjimalarini yangilash boshlandi...");
    
    // Barcha xabarlarni olamiz
    const res = await client.query(`SELECT id, type, data FROM notifications`);
    const notifications = res.rows;
    
    let updatedCount = 0;

    for (const notif of notifications) {
      // JSONB ma'lumotni parse qilamiz
      let parsedData = {};
      if (typeof notif.data === 'string') {
        try { parsedData = JSON.parse(notif.data); } catch (e) {}
      } else if (typeof notif.data === 'object' && notif.data !== null) {
        parsedData = notif.data;
      }

      // translation.js dan shu xabar uchun tarjimalarni olamiz
      const trans = getNotificationTranslations(notif.type, parsedData);
      
      if (trans) {
        await client.query(`
          UPDATE notifications 
          SET 
            title = COALESCE($1, title),
            title_en = COALESCE($2, title_en),
            title_ru = COALESCE($3, title_ru),
            body = COALESCE($4, body),
            body_en = COALESCE($5, body_en),
            body_ru = COALESCE($6, body_ru)
          WHERE id = $7
        `, [
          trans.title_uz, trans.title_en, trans.title_ru,
          trans.body_uz, trans.body_en, trans.body_ru,
          notif.id
        ]);
        updatedCount++;
      }
    }

    console.log(`Bajarildi! Jami ${updatedCount} ta bildirishnoma qayta tarjima qilinib DB da yangilandi.`);
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateOldNotifications();
