// src/cron.js
const cron = require("node-cron");
const { runProposalDepositRefundJob } = require("./jobs/proposalDepositRefundJob");

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

  // Har 6 soatda valyuta kurslarini yangilash
  const { syncRates } = require("./services/currencyService");
  cron.schedule("0 */6 * * *", async () => {
    console.log("[cron] Syncing currency rates...");
    await syncRates();
  });

  // Server ishga tushganda bir marta ishlatish
  syncRates();

  console.log("[cron] started");
}

module.exports = { startCron };