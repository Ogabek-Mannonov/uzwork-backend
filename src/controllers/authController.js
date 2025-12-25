// src/controllers/authController.js
const pool = require('../db/pool');
const { hashPassword } = require('../utils/hashPassword');

const signup = async (req, res) => {
  const { 
    username, 
    firstName, 
    lastName, 
    displayName, 
    email, 
    phone, 
    password, 
    role 
  } = req.body;

  // Majburiy maydonlarni tekshirish
  if (!username || !firstName || !lastName || !password || !role) {
    return res.status(400).json({ message: 'Majburiy maydonlar to‘ldirilmagan' });
  }

  if (!['freelancer', 'client', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Noto‘g‘ri role' });
  }

  try {
    // Username, email, phone unikalligini tekshirish
    const checkQuery = `
      SELECT id FROM users 
      WHERE username = $1 OR email = $2 OR phone = $3
    `;
    const checkResult = await pool.query(checkQuery, [username, email || null, phone || null]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ message: 'Username, email yoki telefon allaqachon ishlatilgan' });
    }

    // Parolni hash qilish
    const passwordHash = await hashPassword(password);

    // Yangi user yaratish
    const insertQuery = `
      INSERT INTO users (
        username, first_name, last_name, display_name, 
        email, phone, password_hash, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, first_name, last_name, email, phone, role, created_at
    `;

    const values = [
      username,
      firstName,
      lastName,
      displayName || null,
      email || null,
      phone || null,
      passwordHash,
      role
    ];

    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      message: 'Foydalanuvchi muvaffaqiyatli ro‘yxatdan o‘tdi!',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('Signup xatosi:', err);
    res.status(500).json({ 
      message: 'Server xatosi', 
      error: err.message 
    });
  }
};

module.exports = { signup };