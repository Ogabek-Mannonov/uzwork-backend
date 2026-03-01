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

  console.log("[cron] started");
}

module.exports = { startCron };