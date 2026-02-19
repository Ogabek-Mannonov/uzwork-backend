const pool = require("../db/pool");

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

/**
 * Public: GET /freelancers/:id/certifications
 */
const getPublicCertificationsByFreelancerId = async (req, res) => {
  try {
    const freelancerId = req.params.id;

    const uR = await pool.query(
      `SELECT id FROM users WHERE id=$1 AND role='freelancer' AND deleted_at IS NULL LIMIT 1`,
      [freelancerId]
    );
    if (uR.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Freelancer topilmadi." });
    }

    const r = await pool.query(
      `
      SELECT
        id, user_id, title, issuer, issue_year, issue_month,
        credential_id, credential_url,
        certificate_file_url, certificate_filename, certificate_mime, certificate_size_bytes,
        created_at, updated_at
      FROM freelancer_certifications
      WHERE user_id = $1
      ORDER BY issue_year DESC NULLS LAST, issue_month DESC NULLS LAST, created_at DESC
      `,
      [freelancerId]
    );

    return res.json({ success: true, data: { certifications: r.rows } });
  } catch (e) {
    console.error("getPublicCertificationsByFreelancerId error:", e);
    return res.status(500).json({ success: false, message: "Certificationlarni olishda xato.", error: e.message });
  }
};

/**
 * Protected: GET /freelancers/me/certifications
 */
const getMyCertifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const r = await pool.query(
      `
      SELECT
        id, user_id, title, issuer, issue_year, issue_month,
        credential_id, credential_url,
        certificate_file_url, certificate_filename, certificate_mime, certificate_size_bytes,
        created_at, updated_at
      FROM freelancer_certifications
      WHERE user_id = $1
      ORDER BY issue_year DESC NULLS LAST, issue_month DESC NULLS LAST, created_at DESC
      `,
      [userId]
    );

    return res.json({ success: true, data: { certifications: r.rows } });
  } catch (e) {
    console.error("getMyCertifications error:", e);
    return res.status(500).json({ success: false, message: "Certificationlarni olishda xato.", error: e.message });
  }
};

/**
 * POST /freelancers/me/certifications
 * Body: { title, issuer, issue_year, issue_month, credential_id, credential_url }
 */
const createCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, issuer, issue_year, issue_month, credential_id, credential_url } = req.body;

    if (!title || String(title).trim().length < 2) {
      return res.status(400).json({ success: false, message: "Title majburiy (kamida 2 ta belgi)." });
    }

    const year = issue_year != null ? toInt(issue_year) : null;
    const month = issue_month != null ? toInt(issue_month) : null;

    const r = await pool.query(
      `
      INSERT INTO freelancer_certifications
        (user_id, title, issuer, issue_year, issue_month, credential_id, credential_url, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING
        id, user_id, title, issuer, issue_year, issue_month, credential_id, credential_url,
        certificate_file_url, certificate_filename, certificate_mime, certificate_size_bytes,
        created_at, updated_at
      `,
      [
        userId,
        String(title).trim(),
        issuer ? String(issuer).trim() : null,
        year,
        month,
        credential_id ? String(credential_id).trim() : null,
        credential_url ? String(credential_url).trim() : null,
      ]
    );

    return res.status(201).json({ success: true, message: "Certification qo‘shildi.", data: { certification: r.rows[0] } });
  } catch (e) {
    console.error("createCertification error:", e);
    return res.status(500).json({ success: false, message: "Certification qo‘shishda xato.", error: e.message });
  }
};

/**
 * PUT /freelancers/me/certifications/:certId
 */
const updateCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { certId } = req.params;

    const { title, issuer, issue_year, issue_month, credential_id, credential_url } = req.body;

    const exists = await pool.query(
      `SELECT id FROM freelancer_certifications WHERE id=$1 AND user_id=$2 LIMIT 1`,
      [certId, userId]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Certification topilmadi." });
    }

    const year = issue_year !== undefined ? (issue_year === null ? null : toInt(issue_year)) : undefined;
    const month = issue_month !== undefined ? (issue_month === null ? null : toInt(issue_month)) : undefined;

    const r = await pool.query(
      `
      UPDATE freelancer_certifications
      SET
        title = COALESCE($3, title),
        issuer = COALESCE($4, issuer),
        issue_year = COALESCE($5, issue_year),
        issue_month = COALESCE($6, issue_month),
        credential_id = COALESCE($7, credential_id),
        credential_url = COALESCE($8, credential_url),
        updated_at = NOW()
      WHERE id=$1 AND user_id=$2
      RETURNING
        id, user_id, title, issuer, issue_year, issue_month, credential_id, credential_url,
        certificate_file_url, certificate_filename, certificate_mime, certificate_size_bytes,
        created_at, updated_at
      `,
      [
        certId,
        userId,
        title ? String(title).trim() : null,
        issuer ? String(issuer).trim() : null,
        year !== undefined ? year : null,
        month !== undefined ? month : null,
        credential_id ? String(credential_id).trim() : null,
        credential_url ? String(credential_url).trim() : null,
      ]
    );

    return res.json({ success: true, message: "Certification yangilandi.", data: { certification: r.rows[0] } });
  } catch (e) {
    console.error("updateCertification error:", e);
    return res.status(500).json({ success: false, message: "Certification yangilashda xato.", error: e.message });
  }
};

/**
 * DELETE /freelancers/me/certifications/:certId
 */
const deleteCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { certId } = req.params;

    const r = await pool.query(
      `DELETE FROM freelancer_certifications WHERE id=$1 AND user_id=$2 RETURNING id`,
      [certId, userId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Certification topilmadi." });
    }

    return res.json({ success: true, message: "Certification o‘chirildi." });
  } catch (e) {
    console.error("deleteCertification error:", e);
    return res.status(500).json({ success: false, message: "Certification o‘chirishda xato.", error: e.message });
  }
};

/**
 * POST /freelancers/me/certifications/:certId/file
 * form-data: file=<pdf|image>
 */
const uploadCertificationFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { certId } = req.params;

    const exists = await pool.query(
      `SELECT id FROM freelancer_certifications WHERE id=$1 AND user_id=$2 LIMIT 1`,
      [certId, userId]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Certification topilmadi." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "File yuborilmadi." });
    }

    const fileUrl = `/uploads/certifications/${req.file.filename}`;

    const r = await pool.query(
      `
      UPDATE freelancer_certifications
      SET
        certificate_file_url = $3,
        certificate_filename = $4,
        certificate_mime = $5,
        certificate_size_bytes = $6,
        file_updated_at = NOW(),
        updated_at = NOW()
      WHERE id=$1 AND user_id=$2
      RETURNING
        id, user_id, title, issuer, issue_year, issue_month,
        credential_id, credential_url,
        certificate_file_url, certificate_filename, certificate_mime, certificate_size_bytes,
        created_at, updated_at, file_updated_at
      `,
      [certId, userId, fileUrl, req.file.originalname || null, req.file.mimetype || null, req.file.size || null]
    );

    return res.json({ success: true, message: "Sertifikat file yuklandi.", data: { certification: r.rows[0] } });
  } catch (e) {
    console.error("uploadCertificationFile error:", e);
    return res.status(500).json({ success: false, message: "File yuklashda xato.", error: e.message });
  }
};

/**
 * DELETE /freelancers/me/certifications/:certId/file
 */
const deleteCertificationFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { certId } = req.params;

    const r = await pool.query(
      `
      UPDATE freelancer_certifications
      SET
        certificate_file_url = NULL,
        certificate_filename = NULL,
        certificate_mime = NULL,
        certificate_size_bytes = NULL,
        file_updated_at = NULL,
        updated_at = NOW()
      WHERE id=$1 AND user_id=$2
      RETURNING id
      `,
      [certId, userId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Certification topilmadi." });
    }

    return res.json({ success: true, message: "Sertifikat file o‘chirildi." });
  } catch (e) {
    console.error("deleteCertificationFile error:", e);
    return res.status(500).json({ success: false, message: "File o‘chirishda xato.", error: e.message });
  }
};

module.exports = {
  getPublicCertificationsByFreelancerId,
  getMyCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  uploadCertificationFile,
  deleteCertificationFile,
};
