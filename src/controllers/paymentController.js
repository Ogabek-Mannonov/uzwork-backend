// src/controllers/paymentController.js
const pool = require('../db/pool');

/**
 * GET /payments
 * Get payment history
 */
const getPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { payment_type, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (payment_type) {
      whereClause += ` AND payment_type = $${paramIndex++}`;
      queryParams.push(payment_type);
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM payments ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get payments
    const paymentsQuery = `
      SELECT *
      FROM payments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const paymentsResult = await pool.query(paymentsQuery, queryParams);

    res.json({
      success: true,
      data: {
        payments: paymentsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'To\'lovlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /balance
 * Get current user balance
 */
const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get or create balance
    let balanceResult = await pool.query(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      // Create balance record
      await pool.query(
        'INSERT INTO user_balances (user_id) VALUES ($1)',
        [userId]
      );
      balanceResult = await pool.query(
        'SELECT * FROM user_balances WHERE user_id = $1',
        [userId]
      );
    }

    res.json({
      success: true,
      data: {
        balance: balanceResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Balansni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /payments/deposit
 * Deposit money to balance
 */
const deposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, payment_method = 'payme', currency = 'UZS' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'To\'lov summasi noto\'g\'ri.'
      });
    }

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (
        user_id, payment_type, amount, currency, payment_method, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [userId, 'deposit', amount, currency, payment_method, 'pending']
    );

    // TODO: Integrate with Payme/Click/Stripe API
    // For now, just return payment record

    res.status(201).json({
      success: true,
      message: 'To\'lov yaratildi. To\'lovni yakunlang.',
      data: {
        payment: paymentResult.rows[0],
        payment_url: `https://payme.uz/checkout/${paymentResult.rows[0].id}` // Example
      }
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'To\'lov yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /payments/withdraw
 * Withdraw money from balance (freelancer only)
 */
const withdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancerlar pul yechib olishi mumkin.'
      });
    }

    const { amount, payment_method = 'card', currency = 'UZS' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Summa noto\'g\'ri.'
      });
    }

    // Check balance
    const balanceResult = await pool.query(
      'SELECT available_balance FROM user_balances WHERE user_id = $1',
      [userId]
    );

    if (balanceResult.rows.length === 0 || balanceResult.rows[0].available_balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Balansda yetarli mablag\' yo\'q.'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create withdrawal payment
      const paymentResult = await pool.query(
        `INSERT INTO payments (
          user_id, payment_type, amount, currency, payment_method, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [userId, 'withdraw', amount, currency, payment_method, 'pending']
      );

      // Update balance
      await pool.query(
        'UPDATE user_balances SET available_balance = available_balance - $1 WHERE user_id = $2',
        [amount, userId]
      );

      await pool.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Yechib olish so\'rovi yuborildi!',
        data: {
          payment: paymentResult.rows[0]
        }
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({
      success: false,
      message: 'Pul yechib olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /payments/webhook
 * Payment webhook handler (Payme, Click, Stripe)
 */
const paymentWebhook = async (req, res) => {
  try {
    const { transaction_id, status, amount, payment_method } = req.body;

    // Find payment by transaction_id
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE transaction_id = $1',
      [transaction_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'To\'lov topilmadi.'
      });
    }

    const payment = paymentResult.rows[0];

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update payment status
      await pool.query(
        'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, payment.id]
      );

      // If payment completed, update balance
      if (status === 'completed' && payment.payment_type === 'deposit') {
        // Get or create balance
        await pool.query(
          `INSERT INTO user_balances (user_id, available_balance)
           VALUES ($1, $2)
           ON CONFLICT (user_id) 
           DO UPDATE SET available_balance = user_balances.available_balance + $2`,
          [payment.user_id, payment.amount]
        );
      }

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Webhook qabul qilindi.'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook qayta ishlashda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /contracts/:id/release
 * Release milestone payment
 */
const releaseMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { milestone_id, amount } = req.body;

    // Check if user is contract client
    const contractResult = await pool.query(
      'SELECT client_id, freelancer_id FROM contracts WHERE id = $1',
      [id]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shartnoma topilmadi.'
      });
    }

    const contract = contractResult.rows[0];

    if (contract.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Siz bu shartnomaning egasi emassiz.'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create payment record
      const paymentResult = await pool.query(
        `INSERT INTO payments (
          user_id, contract_id, payment_type, amount, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [contract.freelancer_id, id, 'release', amount, 'completed']
      );

      // Update client balance (deduct)
      await pool.query(
        `UPDATE user_balances 
         SET available_balance = available_balance - $1,
             total_spent = total_spent + $1
         WHERE user_id = $2`,
        [amount, userId]
      );

      // Update freelancer balance (add)
      await pool.query(
        `INSERT INTO user_balances (user_id, available_balance, total_earned)
         VALUES ($1, $2, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           available_balance = user_balances.available_balance + $2,
           total_earned = user_balances.total_earned + $2`,
        [contract.freelancer_id, amount]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'To\'lov o\'tkazildi!',
        data: {
          payment: paymentResult.rows[0]
        }
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Release milestone error:', error);
    res.status(500).json({
      success: false,
      message: 'To\'lovni o\'tkazishda xato yuz berdi.',
      error: error.message
    });
  }
};

module.exports = {
  getPayments,
  getBalance,
  deposit,
  withdraw,
  paymentWebhook,
  releaseMilestone
};

