// src/cron.js
const cron = require("node-cron");
const { runProposalDepositRefundJob } = require("./jobs/proposalDepositRefundJob");
const { runAutoRatingJob } = require("./jobs/autoRatingJob");

function startCron() {
  // har 10 daqiqada
  cron.schedule("*/10 * * * *", async () => {
    try {
      const r = await runProposalDepositRefundJob();
      if (r.processed) {
        console.log(`[cron] proposal deposit refund processed: ${r.processed}`);
      }
    } catch (e) {
      console.error("[cron] proposal deposit refund failed:", e.message);
    }
  });

  // Har kuni yarim tunda (00:00) avtomatik reytinglarni tekshirish va yozish
  cron.schedule("0 0 * * *", async () => {
    console.log("[cron] Running 14-day silent auto-rating job...");
    try {
      const r = await runAutoRatingJob();
      if (r.processed) {
        console.log(`[cron] Silent completion auto-rating processed: ${r.processed} ratings`);
      }
    } catch (e) {
      console.error("[cron] Silent completion auto-rating failed:", e.message);
    }
  });

  // Har 6 soatda valyuta kurslarini yangilash
  const { syncRates } = require("./services/currencyService");
  cron.schedule("0 */6 * * *", async () => {
    console.log("[cron] Syncing currency rates...");
    await syncRates();
  });

  // Server ishga tushganda bir marta ishlatish
  syncRates();
  
  // Server ishga tushganda bir marta avtomatik baholashni ham ishga tushirib yuboramiz
  console.log("[cron] Initial run of 14-day silent auto-rating job...");
  runAutoRatingJob()
    .then(r => {
      if (r.processed) console.log(`[cron] Initial silent completion auto-rating processed: ${r.processed} ratings`);
    })
    .catch(e => console.error("[cron] Initial silent completion auto-rating failed:", e.message));

  console.log("[cron] started");
}

module.exports = { startCron };