// src/controllers/currencyController.js
const pool = require('../db/pool');

/**
 * GET /currencies/rates
 * Get currency exchange rates
 */
const getRates = async (req, res) => {
  try {
    const { from = 'UZS', to } = req.query;

    let query;
    let params;

    if (to) {
      // Get specific rate
      query = `
        SELECT rate, created_at
        FROM currency_rates
        WHERE from_currency = $1 AND to_currency = $2
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params = [from, to];
    } else {
      // Get all rates from UZS
      query = `
        SELECT to_currency, rate, created_at
        FROM currency_rates
        WHERE from_currency = $1
        AND created_at = (SELECT MAX(created_at) FROM currency_rates WHERE from_currency = $1)
      `;
      params = [from];
    }

    const result = await pool.query(query, params);

    // If no rates in DB, return default rates
    if (result.rows.length === 0) {
      const systemRate = Number(process.env.USD_TO_UZS_RATE || 12600);
      const defaultRates = {
        UZS: { USD: 1 / systemRate, RUB: 0.007 },
        USD: { UZS: systemRate, RUB: 90 },
        RUB: { UZS: 140, USD: 0.011 }
      };

      return res.json({
        success: true,
        data: {
          rates: defaultRates[from] || {},
          source: 'default',
          note: 'Database da kurslar yo\'q, standart kurslar ko\'rsatilmoqda'
        }
      });
    }

    res.json({
      success: true,
      data: {
        rates: result.rows,
        source: 'database'
      }
    });
  } catch (error) {
    console.error('Get rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /currencies/rates
 * Update currency rates (admin only, or from external API)
 */
const updateRates = async (req, res) => {
  try {
    const { from_currency, to_currency, rate } = req.body;

    if (!from_currency || !to_currency || !rate) {
      return res.status(400).json({
        success: false,
        message: 'Barcha maydonlar kerak.'
      });
    }

    await pool.query(
      `INSERT INTO currency_rates (from_currency, to_currency, rate)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [from_currency, to_currency, rate]
    );

    res.json({
      success: true,
      message: 'Kurs yangilandi!'
    });
  } catch (error) {
    console.error('Update rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Kursni yangilashda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  getRates,
  updateRates
};


