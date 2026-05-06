// src/controllers/profileController.js
const pool = require("../db/pool");
const { createNotification } = require("./notificationController");

// ---------------- helpers ----------------
const isUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );

const toJsonbOrNull = (val) => {
  // undefined -> null (COALESCE bilan eski qiymat qoladi)
  if (val === undefined) return null;
  if (val === null) return null;
  const arr = Array.isArray(val) ? val : [val];
  return JSON.stringify(arr);
};
const toStrOrNull = (val) => (val === undefined ? null : val === null ? null : String(val));
const toNumOrNull = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

// -------- schema cache (1 marta tekshiradi) --------
let schemaCache = null;

async function loadSchemaCache() {
  if (schemaCache) return schemaCache;

  // users columns
  const usersColsR = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users'
    `
  );
  const usersCols = new Set(usersColsR.rows.map((r) => r.column_name));

  // reviews table exists?
  const reviewsR = await pool.query(`SELECT to_regclass('public.reviews') AS t`);
  const hasReviews = !!reviewsR.rows[0]?.t;

  schemaCache = {
    usersCols,
    hasReviews,
  };
  return schemaCache;
}

function hasUserColumn(cache, col) {
  return cache.usersCols.has(col);
}

// ---------------- controllers ----------------
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Auth kerak." });

    const cache = await loadSchemaCache();

    // users select (faqat mavjud columnlarni qo‘shamiz)
    const selectCols = [
      "id",
      "email",
      "phone",
      "first_name",
      "last_name",
      "role",
      "username",
      "created_at",
      "updated_at",
    ];

    if (hasUserColumn(cache, "avatar_url")) selectCols.push("avatar_url");
    if (hasUserColumn(cache, "is_email_verified")) selectCols.push("is_email_verified");
    if (hasUserColumn(cache, "is_phone_verified")) selectCols.push("is_phone_verified");
    if (hasUserColumn(cache, "is_kyc_verified")) selectCols.push("is_kyc_verified");
    if (hasUserColumn(cache, "kyc_status")) selectCols.push("kyc_status");

    // deleted_at column bo‘lmasa ham ketadi (WHERE ni shartli qilamiz)
    const hasDeletedAt = hasUserColumn(cache, "deleted_at");

    const userRes = await pool.query(
      `
      SELECT ${selectCols.join(", ")}
      FROM users
      WHERE id = $1
      ${hasDeletedAt ? "AND deleted_at IS NULL" : ""}
      `,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi." });
    }

    const user = userRes.rows[0];
    let roleProfile = null;

    if (user.role === "freelancer") {
      const fp = await pool.query(
        `SELECT fp.*, cat.name as category_name 
         FROM freelancer_profiles fp 
         LEFT JOIN categories cat ON fp.category_id = cat.id 
         WHERE fp.user_id = $1`,
        [userId]
      );
      roleProfile = fp.rows[0] || null;
    } else if (user.role === "client") {
      const cp = await pool.query(
        `SELECT * FROM client_profiles WHERE user_id = $1`,
        [userId]
      );
      roleProfile = cp.rows[0] || null;
    }

    // reviews & in_progress_jobs bo‘lmasa ham yiqilmaydi:
    let averageRating = null;
    let totalReviews = 0;
    let inProgressJobs = 0;
    let completedJobs = 0;

    // 1. In Progress Jobs
    const activeField = user.role === "freelancer" ? "freelancer_id" : "client_id";
    const ip = await pool.query(
      `SELECT COUNT(*)::int AS count FROM contracts WHERE ${activeField} = $1 AND status = 'active'`,
      [userId]
    );
    inProgressJobs = ip.rows[0]?.count ?? 0;

    // 2. Completed Jobs
    const cj = await pool.query(
      `SELECT COUNT(*)::int AS count FROM contracts WHERE ${activeField} = $1 AND status = 'completed'`,
      [userId]
    );
    completedJobs = cj.rows[0]?.count ?? 0;

    // 3. Reviews from ratings table
    const r = await pool.query(
      `
      SELECT
        COALESCE(AVG(
          COALESCE(
            (COALESCE(score_quality, 0) + COALESCE(score_timeliness, 0) + COALESCE(score_communication, 0)) / 
            NULLIF((CASE WHEN score_quality IS NOT NULL THEN 1.0 ELSE 0.0 END + CASE WHEN score_timeliness IS NOT NULL THEN 1.0 ELSE 0.0 END + CASE WHEN score_communication IS NOT NULL THEN 1.0 ELSE 0.0 END), 0.0),
            (COALESCE(score_payment, 0) + COALESCE(score_clarity, 0)) / 
            NULLIF((CASE WHEN score_payment IS NOT NULL THEN 1.0 ELSE 0.0 END + CASE WHEN score_clarity IS NOT NULL THEN 1.0 ELSE 0.0 END), 0.0)
          )
        ), 0) AS avg_rating,
        COUNT(*)::int AS total_reviews
      FROM ratings
      WHERE to_user_id = $1
      `,
      [userId]
    );
    totalReviews = r.rows[0]?.total_reviews ?? 0;
    if (totalReviews > 0) {
      averageRating = Number(r.rows[0].avg_rating).toFixed(2);
    } else if (roleProfile?.rating != null) {
      averageRating = Number(roleProfile.rating).toFixed(2);
    }


    return res.json({
      success: true,
      data: {
        user,
        profile: roleProfile,
        average_rating: averageRating,
        total_reviews: totalReviews,
        in_progress_jobs: inProgressJobs,
        completed_jobs: completedJobs,
      },
    });
  } catch (error) {
    console.error("Get my profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Profilni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isUUID(userId)) {
      return res.status(400).json({ success: false, message: "Noto‘g‘ri userId (UUID)." });
    }

    const cache = await loadSchemaCache();

    // Public profile => email/phone yo‘q
    const selectCols = ["id", "first_name", "last_name", "role", "username", "created_at"];

    if (hasUserColumn(cache, "avatar_url")) selectCols.push("avatar_url");
    if (hasUserColumn(cache, "is_kyc_verified")) selectCols.push("is_kyc_verified");

    const hasDeletedAt = hasUserColumn(cache, "deleted_at");

    const userRes = await pool.query(
      `
      SELECT ${selectCols.join(", ")}
      FROM users
      WHERE id = $1
      ${hasDeletedAt ? "AND deleted_at IS NULL" : ""}
      `,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi." });
    }

    const user = userRes.rows[0];
    let roleProfile = null;

    if (user.role === "freelancer") {
      const fp = await pool.query(
        `SELECT fp.*, cat.name as category_name 
         FROM freelancer_profiles fp 
         LEFT JOIN categories cat ON fp.category_id = cat.id 
         WHERE fp.user_id = $1`,
        [userId]
      );
      roleProfile = fp.rows[0] || null;
    } else if (user.role === "client") {
      const cp = await pool.query(
        `SELECT * FROM client_profiles WHERE user_id = $1`,
        [userId]
      );
      roleProfile = cp.rows[0] || null;
    }

    let averageRating = null;
    let totalReviews = 0;
    let inProgressJobs = 0;
    let completedJobs = 0;

    // 1. In Progress Jobs
    const activeField = user.role === "freelancer" ? "freelancer_id" : "client_id";
    const ip = await pool.query(
      `SELECT COUNT(*)::int AS count FROM contracts WHERE ${activeField} = $1 AND status = 'active'`,
      [userId]
    );
    inProgressJobs = ip.rows[0]?.count ?? 0;

    // 2. Completed Jobs
    const cj = await pool.query(
      `SELECT COUNT(*)::int AS count FROM contracts WHERE ${activeField} = $1 AND status = 'completed'`,
      [userId]
    );
    completedJobs = cj.rows[0]?.count ?? 0;

    // 3. Reviews from ratings table
    const r = await pool.query(
      `
      SELECT
        COALESCE(AVG(
          COALESCE(
            (COALESCE(score_quality, 0) + COALESCE(score_timeliness, 0) + COALESCE(score_communication, 0)) / 
            NULLIF((CASE WHEN score_quality IS NOT NULL THEN 1.0 ELSE 0.0 END + CASE WHEN score_timeliness IS NOT NULL THEN 1.0 ELSE 0.0 END + CASE WHEN score_communication IS NOT NULL THEN 1.0 ELSE 0.0 END), 0.0),
            (COALESCE(score_payment, 0) + COALESCE(score_clarity, 0)) / 
            NULLIF((CASE WHEN score_payment IS NOT NULL THEN 1.0 ELSE 0.0 END + CASE WHEN score_clarity IS NOT NULL THEN 1.0 ELSE 0.0 END), 0.0)
          )
        ), 0) AS avg_rating,
        COUNT(*)::int AS total_reviews
      FROM ratings
      WHERE to_user_id = $1
      `,
      [userId]
    );
    totalReviews = r.rows[0]?.total_reviews ?? 0;
    if (totalReviews > 0) {
      averageRating = Number(r.rows[0].avg_rating).toFixed(2);
    } else if (roleProfile?.rating != null) {
      averageRating = Number(roleProfile.rating).toFixed(2);
    }


    return res.json({
      success: true,
      data: {
        user,
        profile: roleProfile,
        average_rating: averageRating,
        total_reviews: totalReviews,
        in_progress_jobs: inProgressJobs,
        completed_jobs: completedJobs,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Profilni olishda xato yuz berdi.",
      error: error.message,
    });
  }
};

const updateMyProfile = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) return res.status(401).json({ success: false, message: "Auth kerak." });

    const {
      // Users table fields
      first_name,
      last_name,
      display_name,
      email,
      phone,
      avatar_url,
      // Freelancer/Client common fields
      location,

      // Freelancer specific
      title,
      bio,
      hourly_rate,
      languages,
      skills,
      cover_url,
      cv_url,
      availability_status,
      category_id,

      // Client specific
      company_name,
      company_website,
      company_size,
    } = req.body;

    await client.query("BEGIN");

    // 1. Update users table (shared info)
    const userUpdateCols = [];
    const userUpdateVals = [];
    let paramIdx = 1;

    if (first_name !== undefined) {
      userUpdateCols.push(`first_name = $${paramIdx++}`);
      userUpdateVals.push(toStrOrNull(first_name));
    }
    if (last_name !== undefined) {
      userUpdateCols.push(`last_name = $${paramIdx++}`);
      userUpdateVals.push(toStrOrNull(last_name));
    }
    if (display_name !== undefined) {
      userUpdateCols.push(`display_name = $${paramIdx++}`);
      userUpdateVals.push(toStrOrNull(display_name));
    }
    if (email !== undefined) {
      userUpdateCols.push(`email = $${paramIdx++}`);
      userUpdateVals.push(toStrOrNull(email));
    }
    if (phone !== undefined) {
      userUpdateCols.push(`phone = $${paramIdx++}`);
      userUpdateVals.push(toStrOrNull(phone));
    }
    if (avatar_url !== undefined) {
      userUpdateCols.push(`avatar_url = $${paramIdx++}`);
      userUpdateVals.push(toStrOrNull(avatar_url));
    }

    if (userUpdateCols.length > 0) {
      userUpdateVals.push(userId);
      await client.query(
        `UPDATE users SET ${userUpdateCols.join(", ")}, updated_at = NOW() WHERE id = $${paramIdx}`,
        userUpdateVals
      );

      // ✅ Security Notifications
      const io = req.app.get("io");
      if (email !== undefined) {
        createNotification(io, {
          userId: userId,
          type: 'email_updated',
          relatedId: userId,
          relatedType: 'user'
        });
      }
      if (phone !== undefined) {
        createNotification(io, {
          userId: userId,
          type: 'phone_updated',
          relatedId: userId,
          relatedType: 'user'
        });
      }
    }

    let roleProfile = null;

    // 2. Update role-specific profile table
    if (role === "freelancer") {
      const result = await client.query(
        `
        INSERT INTO freelancer_profiles (
          user_id, title, bio, hourly_rate, location,
          languages, skills,
          avatar_url, cover_url, cv_url, availability_status, category_id
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6::jsonb, $7::jsonb,
          $8, $9, $10, $11, $12
        )
        ON CONFLICT (user_id) DO UPDATE SET
          title = COALESCE(EXCLUDED.title, freelancer_profiles.title),
          bio = COALESCE(EXCLUDED.bio, freelancer_profiles.bio),
          hourly_rate = COALESCE(EXCLUDED.hourly_rate, freelancer_profiles.hourly_rate),
          location = COALESCE(EXCLUDED.location, freelancer_profiles.location),
          languages = COALESCE(EXCLUDED.languages, freelancer_profiles.languages),
          skills = COALESCE(EXCLUDED.skills, freelancer_profiles.skills),
          avatar_url = COALESCE(EXCLUDED.avatar_url, freelancer_profiles.avatar_url),
          cover_url = COALESCE(EXCLUDED.cover_url, freelancer_profiles.cover_url),
          cv_url = COALESCE(EXCLUDED.cv_url, freelancer_profiles.cv_url),
          availability_status = COALESCE(EXCLUDED.availability_status, freelancer_profiles.availability_status),
          category_id = COALESCE(EXCLUDED.category_id, freelancer_profiles.category_id),
          updated_at = NOW()
        RETURNING *
        `,
        [
          userId,
          toStrOrNull(title),
          toStrOrNull(bio),
          toNumOrNull(hourly_rate),
          toStrOrNull(location),
          toJsonbOrNull(languages),
          toJsonbOrNull(skills),
          toStrOrNull(avatar_url),
          toStrOrNull(cover_url),
          toStrOrNull(cv_url),
          toStrOrNull(availability_status),
          toNumOrNull(category_id),
        ]
      );
      roleProfile = result.rows[0];
    } else if (role === "client") {
      const result = await client.query(
        `
        INSERT INTO client_profiles (
          user_id, company_name, company_website, company_size, bio, cover_url
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          company_name = COALESCE(EXCLUDED.company_name, client_profiles.company_name),
          company_website = COALESCE(EXCLUDED.company_website, client_profiles.company_website),
          company_size = COALESCE(EXCLUDED.company_size, client_profiles.company_size),
          bio = COALESCE(EXCLUDED.bio, client_profiles.bio),
          cover_url = COALESCE(EXCLUDED.cover_url, client_profiles.cover_url),
          updated_at = NOW()
        RETURNING *
        `,
        [
          userId, 
          toStrOrNull(company_name), 
          toStrOrNull(company_website), 
          toStrOrNull(company_size),
          toStrOrNull(bio),
          toStrOrNull(cover_url)
        ]
      );
      roleProfile = result.rows[0];
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Profil muvaffaqiyatli yangilandi!",
      data: { profile: roleProfile },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Profilni yangilashda xato yuz berdi.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};


const getCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ success: false, message: "Kategoriyalarni olishda xato." });
  }
};

module.exports = { getMyProfile, getUserProfile, updateMyProfile, getCategories };
