// src/controllers/marketplaceController.js
const pool = require('../db/pool');

/**
 * GET /marketplace
 * Get all marketplace products
 */
const getMarketplace = async (req, res) => {
  try {
    const {
      category,
      min_price,
      max_price,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ['status = $1'];
    let queryParams = ['active'];
    let paramIndex = 2;

    if (category) {
      whereConditions.push(`category = $${paramIndex++}`);
      queryParams.push(category);
    }

    if (min_price) {
      whereConditions.push(`price >= $${paramIndex++}`);
      queryParams.push(parseFloat(min_price));
    }

    if (max_price) {
      whereConditions.push(`price <= $${paramIndex++}`);
      queryParams.push(parseFloat(max_price));
    }

    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM marketplace WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get products
    const productsQuery = `
      SELECT 
        m.*,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name
      FROM marketplace m
      JOIN users u ON m.seller_id = u.id
      WHERE ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    const productsResult = await pool.query(productsQuery, queryParams);

    res.json({
      success: true,
      data: {
        products: productsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get marketplace error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulotlarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /marketplace/categories
 * Get marketplace categories
 */
const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM marketplace
       WHERE status = 'active'
       GROUP BY category
       ORDER BY count DESC`
    );

    res.json({
      success: true,
      data: {
        categories: result.rows
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriyalarni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * GET /marketplace/:id
 * Get product by ID
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        m.*,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        u.email as seller_email
      FROM marketplace m
      JOIN users u ON m.seller_id = u.id
      WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi.'
      });
    }

    res.json({
      success: true,
      data: {
        product: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulotni olishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /marketplace
 * Create marketplace product (freelancer only)
 */
const createProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Faqat freelancerlar mahsulot joylashtirishi mumkin.'
      });
    }

    const {
      title,
      description,
      category,
      price,
      currency = 'UZS',
      preview_images,
      download_url,
      tags
    } = req.body;

    if (!title || !description || !category || !price || !download_url) {
      return res.status(400).json({
        success: false,
        message: 'Barcha majburiy maydonlar to\'ldirilishi kerak.'
      });
    }

    const result = await pool.query(
      `INSERT INTO marketplace (
        seller_id, title, description, category, price, currency,
        preview_images, download_url, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        userId,
        title,
        description,
        category,
        price,
        currency,
        preview_images || [],
        download_url,
        tags || []
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli joylashtirildi!',
      data: {
        product: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulot yaratishda xato yuz berdi.',
      error: error.message
    });
  }
};

/**
 * POST /marketplace/:id/buy
 * Buy marketplace product
 */
const buyProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get product
    const productResult = await pool.query(
      'SELECT * FROM marketplace WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi yoki mavjud emas.'
      });
    }

    const product = productResult.rows[0];

    // Check if already purchased
    const purchaseCheck = await pool.query(
      'SELECT id FROM marketplace_purchases WHERE buyer_id = $1 AND product_id = $2',
      [userId, id]
    );

    if (purchaseCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Siz bu mahsulotni allaqachon sotib olgansiz.'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check/Lock balance
      const balanceResult = await client.query(
        'SELECT available_balance FROM user_balances WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      const availableBalance = balanceResult.rows.length > 0 
        ? balanceResult.rows[0].available_balance 
        : 0;

      if (availableBalance < product.price) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Balansda yetarli mablag\' yo\'q.'
        });
      }

      // Create payment
      const paymentResult = await client.query(
        `INSERT INTO payments (
          user_id, payment_type, amount, currency, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [userId, 'escrow', product.price, product.currency, 'completed']
      );

      // Deduct from buyer
      await client.query(
        `UPDATE user_balances 
         SET available_balance = available_balance - $1,
             total_spent = total_spent + $1
         WHERE user_id = $2`,
        [product.price, userId]
      );

      // Add to seller
      await client.query(
        `INSERT INTO user_balances (user_id, available_balance, total_earned)
         VALUES ($1, $2, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           available_balance = user_balances.available_balance + $2,
           total_earned = user_balances.total_earned + $2`,
        [product.seller_id, product.price]
      );

      // Create purchase record
      const purchaseResult = await client.query(
        `INSERT INTO marketplace_purchases (
          buyer_id, product_id, payment_id, purchase_price
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [userId, id, paymentResult.rows[0].id, product.price]
      );

      // Update product sales count
      await client.query(
        'UPDATE marketplace SET sales_count = sales_count + 1 WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Mahsulot sotib olindi!',
        data: {
          purchase: purchaseResult.rows[0],
          download_url: product.download_url
        }
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Buy product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Mahsulotni sotib olishda xato yuz berdi.',
      error: error.message
    });
  }
};


module.exports = {
  getMarketplace,
  getCategories,
  getProductById,
  createProduct,
  buyProduct
};


