// src/services/currencyService.js
const pool = require('../db/pool');

/**
 * Sync rates to database
 */
const syncRates = async () => {
  try {
    const uzsRate = Number(process.env.USD_TO_UZS_RATE || 12200);
    await pool.query(
      `INSERT INTO currency_rates (from_currency, to_currency, rate, source)
       VALUES ('USD', 'UZS', $1, 'fixed')
       ON CONFLICT DO NOTHING`,
      [uzsRate]
    );
    console.log(`[currency] Fixed rate synchronized: USD/UZS = ${uzsRate}`);
  } catch (error) {
    console.error('[currency] Sync error:', error.message);
  }
};


/**
 * Get latest rate from DB or .env fallback
 */
const getLatestRate = async (from = 'USD', to = 'UZS') => {
  try {
    if (from === to) return 1;

    // Try exact match in DB
    const result = await pool.query(
      `SELECT rate FROM currency_rates 
       WHERE from_currency = $1 AND to_currency = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [from, to]
    );

    if (result.rows.length > 0) {
      return Number(result.rows[0].rate);
    }

    // Try inverse match in DB
    const inv = await pool.query(
      `SELECT rate FROM currency_rates 
       WHERE from_currency = $2 AND to_currency = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [from, to]
    );

    if (inv.rows.length > 0) {
      return 1 / Number(inv.rows[0].rate);
    }

    // Fallbacks (synchronized with .env and frontend)
    const fallbackRate = Number(process.env.USD_TO_UZS_RATE || 12200);
    
    if ((from === 'USD' || from === 'usd') && (to === 'UZS' || to === 'uzs')) return fallbackRate;
    if ((from === 'UZS' || from === 'uzs') && (to === 'USD' || to === 'usd')) return 1 / fallbackRate;
    
    // RUB Fallbacks
    if (from === 'USD' && to === 'RUB') return 93;
    if (from === 'RUB' && to === 'USD') return 1 / 93;

    return 1;
  } catch (error) {
    console.error('[currency] Error getting rate:', error.message);
    const fallbackRate = Number(process.env.USD_TO_UZS_RATE || 12200);
    if (from === 'USD' && to === 'UZS') return fallbackRate;
    if (from === 'UZS' && to === 'USD') return 1 / fallbackRate;
    return 1;
  }
};

module.exports = {
  syncRates,
  getLatestRate
};
