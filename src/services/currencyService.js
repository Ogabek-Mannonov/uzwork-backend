// src/services/currencyService.js
const https = require('https');
const pool = require('../db/pool');

/**
 * Fetch latest rates from external API (with redirect support)
 */
const fetchRatesFromApi = (url = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json') => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(fetchRatesFromApi(res.headers.location));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.usd) {
            resolve(json.usd);
          } else {
            reject(new Error('Invalid API response format'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Sync rates to database
 */
const syncRates = async () => {
  try {
    const usdRates = await fetchRatesFromApi();
    const uzsRate = usdRates.uzs;
    const rubRate = usdRates.rub;

    if (uzsRate) {
      await pool.query(
        `INSERT INTO currency_rates (from_currency, to_currency, rate, source)
         VALUES ('USD', 'UZS', $1, 'api')
         ON CONFLICT DO NOTHING`,
        [uzsRate]
      );
    }
    
    if (rubRate) {
      await pool.query(
        `INSERT INTO currency_rates (from_currency, to_currency, rate, source)
         VALUES ('USD', 'RUB', $1, 'api')
         ON CONFLICT DO NOTHING`,
        [rubRate]
      );
    }

    console.log(`[currency] Synced: 1 USD = ${uzsRate} UZS`);
    return { success: true, uzs: uzsRate };
  } catch (error) {
    console.error('[currency] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get latest rate from DB or .env fallback
 */
const getLatestRate = async (from = 'USD', to = 'UZS') => {
  try {
    if (from === to) return 1;

    // Try exact match
    const result = await pool.query(
      `SELECT rate FROM currency_rates 
       WHERE from_currency = $1 AND to_currency = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [from, to]
    );

    if (result.rows.length > 0) {
      return Number(result.rows[0].rate);
    }

    // Try inverse match
    const inv = await pool.query(
      `SELECT rate FROM currency_rates 
       WHERE from_currency = $2 AND to_currency = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [from, to]
    );

    if (inv.rows.length > 0) {
      return 1 / Number(inv.rows[0].rate);
    }

    // Fallbacks
    const fallbackRate = Number(process.env.USD_TO_UZS_RATE || 12600);
    if (from === 'USD' && to === 'UZS') return fallbackRate;
    if (from === 'UZS' && to === 'USD') return 1 / fallbackRate;
    
    return 1;
  } catch (error) {
    console.error('[currency] Error getting rate:', error.message);
    const fallbackRate = Number(process.env.USD_TO_UZS_RATE || 12600);
    if (from === 'USD' && to === 'UZS') return fallbackRate;
    if (from === 'UZS' && to === 'USD') return 1 / fallbackRate;
    return 1;
  }
};

module.exports = {
  syncRates,
  getLatestRate
};
