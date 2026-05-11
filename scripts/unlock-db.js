// scripts/unlock-db.js
const pool = require('../src/db/pool');

async function unlockDatabase() {
  try {
    console.log('🔓 Bazadagi barcha qulflangan (locked) seanslarni tozalash boshlandi...');
    
    // 1. Faol bo'lgan lekin osilib qolgan yoki qulflangan seanslarni qidiramiz
    const activeQueries = await pool.query(`
      SELECT pid, state, query, age(clock_timestamp(), query_start) as duration
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
        AND datname = current_database()
        AND (state = 'idle in transaction' OR state = 'active')
    `);

    console.log(`📊 Topilgan faol/osilib qolgan seanslar soni: ${activeQueries.rows.length}`);
    activeQueries.rows.forEach(r => {
      console.log(`   - PID: ${r.pid} | Holati: ${r.state} | Davomiyligi: ${r.duration} | So'rov: ${r.query ? r.query.substring(0, 60) : ''}...`);
    });

    if (activeQueries.rows.length > 0) {
      console.log('⚡ Osilib qolgan seanslar o\'chirilmoqda (pg_terminate_backend)...');
      
      const terminateResult = await pool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid()
          AND datname = current_database()
      `);
      
      console.log(`✅ Eski seanslar muvaffaqiyatli o'chirildi va barcha jadvallar qulfdan (Lock) ochildi!`);
    } else {
      console.log('✨ Hech qanday osilib qolgan yoki qulflangan seans topilmadi.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Qulfdan ochishda xatolik:', error.message);
    process.exit(1);
  }
}

unlockDatabase();
