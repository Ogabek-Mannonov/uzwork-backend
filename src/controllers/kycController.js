// src/controllers/kycController.js
const pool = require('../db/pool');
const { createNotification } = require('./notificationController');
const crypto = require('crypto');

// ─── In-memory face sessions (MVP) ───────────────────────────────────────────
// Production da Redis ishlatiladi
const faceSessions = new Map();

// Har 5 daqiqada muddati o'tgan sessionlarni tozalash
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of faceSessions.entries()) {
    if (now > session.expiresAt) faceSessions.delete(token);
  }
}, 5 * 60 * 1000);

/**
 * POST /kyc/face/create-session
 * Desktop: QR kod uchun session yaratadi
 */
const createFaceSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 12 * 60 * 1000; // 12 daqiqa

    // Mobile URL — avtomatik ravishda Wi-Fi tarmog'idagi IP (192.168.X.X) ni aniqlaymiz
    let localIp = 'localhost';
    const nets = require('os').networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
          localIp = net.address;
          break;
        }
      }
    }
    const backendUrl = process.env.BACKEND_TUNNEL_URL && !process.env.BACKEND_TUNNEL_URL.includes('loca.lt')
      ? process.env.BACKEND_TUNNEL_URL
      : `http://${localIp}:${process.env.PORT || 3000}`;

    const mobileUrl = `${backendUrl}/kyc/face/${token}`;


    faceSessions.set(token, { userId, status: 'pending', expiresAt, selfie_url: null });

    // QR kodni backend da generate qilish (qrcode paketi kerak)
    let qrDataUrl = null;
    try {
      const QRCode = require('qrcode');
      qrDataUrl = await QRCode.toDataURL(mobileUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });
    } catch {
      // qrcode o'rnatilmagan bo'lsa ham ishlaydi — frontend URL ni ko'rsatadi
    }

    return res.json({
      success: true,
      data: { token, mobileUrl, qrDataUrl, expiresAt },
    });
  } catch (error) {
    console.error('createFaceSession error:', error);
    return res.status(500).json({ success: false, message: 'Session yaratishda xato.' });
  }
};

/**
 * GET /kyc/face/:token/status
 * Desktop: session holatini tekshiradi (polling)
 */
const getFaceSessionStatus = async (req, res) => {
  try {
    const { token } = req.params;
    const session = faceSessions.get(token);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session topilmadi yoki muddati o\'tgan.' });
    }
    if (Date.now() > session.expiresAt) {
      faceSessions.delete(token);
      return res.status(410).json({ success: false, message: 'Session muddati tugagan.' });
    }

    return res.json({
      success: true,
      data: { status: session.status, selfie_url: session.selfie_url || null },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Xato.' });
  }
};

/**
 * GET /kyc/face/:token  (auth shart emas — mobile uchun)
 * To'liq standalone HTML selfie sahifasini qaytaradi
 */
const serveMobilePage = async (req, res) => {
  const { token } = req.params;
  const session = faceSessions.get(token);

  let localIp = 'localhost';
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
        localIp = net.address;
        break;
      }
    }
  }
  const backendUrl = process.env.BACKEND_TUNNEL_URL && !process.env.BACKEND_TUNNEL_URL.includes('loca.lt')
    ? process.env.BACKEND_TUNNEL_URL
    : `http://${localIp}:${process.env.PORT || 3000}`;


  if (!session || Date.now() > session.expiresAt) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>KYC - Muddati tugagan</title>
      <style>body{background:#0f172a;color:#f1f5f9;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}h2{color:#f59e0b;margin-bottom:12px}p{color:#94a3b8}</style>
      </head><body><div><h2>⏱ Muddat tugagan</h2><p>Kompyuterda yangi QR kod yarating va qayta urinib ko'ring.</p></div></body></html>`);
  }

  if (session.status === 'completed') {
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>KYC - Tasdiqlandi</title>
      <style>body{background:#0f172a;color:#f1f5f9;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}h2{color:#22c55e;margin-bottom:12px}p{color:#94a3b8}</style>
      </head><body><div><h2>✅ Tasdiqlandi!</h2><p>Selfie muvaffaqiyatli yuborildi. Bu sahifani yopishingiz mumkin.</p></div></body></html>`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>UzWork - Yuzni tasdiqlash</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f172a;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;height:100dvh;display:flex;flex-direction:column}
    #screen-ready,#screen-uploading,#screen-success,#screen-error{display:none;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;padding:28px;text-align:center;gap:16px}
    #screen-camera{display:none;flex-direction:column;height:100dvh;background:#000;position:relative}
    #screen-preview{display:none;flex-direction:column;height:100dvh;background:#000;position:relative}
    .active{display:flex!important}
    h1{font-size:24px;font-weight:800}
    p{font-size:15px;color:#94a3b8;line-height:1.6;max-width:300px}
    small{font-size:12px;color:#64748b}
    .btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px 32px;border-radius:14px;font-size:16px;font-weight:700;border:none;cursor:pointer;width:100%;max-width:320px;transition:all .2s}
    .btn-primary{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;box-shadow:0 6px 20px rgba(37,99,235,.4)}
    .btn-primary:active{transform:scale(.97)}
    .btn-outline{background:rgba(255,255,255,.07);color:#f1f5f9;border:1px solid rgba(255,255,255,.15)}
    .tip{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 16px;font-size:14px;color:#cbd5e1;text-align:left;width:100%;max-width:320px}
    .icon{font-size:56px;line-height:1}
    #video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
    #preview-img{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
    .cam-header{position:absolute;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;gap:12px;padding:16px 20px;background:linear-gradient(to bottom,rgba(0,0,0,.7) 0%,transparent);color:#fff;font-size:16px;font-weight:600}
    .back-btn{background:rgba(255,255,255,.15);border:none;color:#fff;padding:8px 14px;border-radius:10px;font-size:14px;cursor:pointer}
    .oval-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
    .oval{width:min(240px,70vw);height:min(320px,50vh);border-radius:50%;border:3px solid rgba(255,255,255,.85);box-shadow:0 0 0 2000px rgba(0,0,0,.5),0 0 0 3px rgba(59,130,246,.6) inset;animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{border-color:rgba(255,255,255,.85)}50%{border-color:#3b82f6}}
    .oval-label{margin-top:14px;font-size:13px;color:rgba(255,255,255,.85);background:rgba(0,0,0,.45);padding:6px 14px;border-radius:20px}
    .shutter-row{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;padding:20px 24px 44px;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent)}
    .shutter{width:76px;height:76px;border-radius:50%;border:4px solid rgba(255,255,255,.9);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .shutter:active{transform:scale(.93)}
    .shutter-inner{width:58px;height:58px;border-radius:50%;background:#fff;display:block}
    .preview-actions{position:absolute;bottom:0;left:0;right:0;display:flex;gap:12px;padding:20px 24px 40px;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent)}
    .preview-actions .btn{max-width:none;flex:1;padding:14px 12px;font-size:15px}
    .spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,.15);border-top-color:#3b82f6;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>

<!-- READY -->
<div id="screen-ready" class="active">
  <div class="icon">🛡️</div>
  <h1>Yuzni tasdiqlash</h1>
  <p>Old kamera yonadi va siz selfie tushirasiz.</p>
  <div class="tip">💡 Yaxshi yorug'lik joyda o'tiring</div>
  <div class="tip">📸 Yuzingiz to'liq ko'rinsin</div>
  
  <button class="btn btn-primary" onclick="startCamera()" ontouchstart="startCamera()">📷 Brauzer kamerasida ochish</button>
  
  <div class="btn btn-outline" style="position:relative;overflow:hidden;border-color:#3b82f6;color:#3b82f6;width:100%;max-width:320px">
    <span>⚡ Tizim kamerasida rasmga tushish</span>
    <input id="native-cam" type="file" accept="image/*" capture="user" onchange="handleNativeCapture(event)" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:10" />
  </div>
</div>



<!-- CAMERA -->
<div id="screen-camera">
  <div class="cam-header">
    <button class="back-btn" onclick="stopCamera()">← Orqaga</button>
    <span>Selfie tushiring</span>
  </div>
  <video id="video" autoplay playsinline muted></video>
  <canvas id="canvas" style="display:none"></canvas>
  <div class="oval-overlay">
    <div class="oval"></div>
    <span class="oval-label">Yuzingizni oval ichiga joylashtiring</span>
  </div>
  <div class="shutter-row">
    <button class="shutter" onclick="takeSelfie()">
      <span class="shutter-inner"></span>
    </button>
  </div>
</div>

<!-- PREVIEW -->
<div id="screen-preview">
  <div class="cam-header">
    <button class="back-btn" onclick="retake()">← Qayta olish</button>
    <span>Ko'rib chiqing</span>
  </div>
  <img id="preview-img" alt="selfie" />
  <div class="preview-actions">
    <button class="btn btn-outline" onclick="retake()">🔄 Qayta</button>
    <button class="btn btn-primary" onclick="submitSelfie()">✅ Yuborish</button>
  </div>
</div>

<!-- UPLOADING -->
<div id="screen-uploading">
  <div class="spinner"></div>
  <h1>Yuborilmoqda...</h1>
  <small>Iltimos kuting</small>
</div>

<!-- SUCCESS -->
<div id="screen-success">
  <div class="icon">✅</div>
  <h1 style="color:#22c55e">Muvaffaqiyatli!</h1>
  <p>Selfie tasdiqlandi. Kompyuter sahifasiga qaytishingiz mumkin.</p>
  <small>Bu oynani yopishingiz mumkin.</small>
</div>

<!-- ERROR -->
<div id="screen-error">
  <div class="icon">⚠️</div>
  <h1 style="color:#ef4444">Xato yuz berdi</h1>
  <p id="error-msg"></p>
  <button class="btn btn-outline" onclick="show('ready')">Qayta urinish</button>
</div>

<script>
  const TOKEN = '${token}';
  const BACKEND = window.location.origin;
  let stream = null;
  let capturedBlob = null;


  function show(name) {
    document.querySelectorAll('[id^="screen-"]').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('screen-' + name);
    if (target) target.classList.add('active');
  }

  async function startCamera() {
    try {
      show('camera');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      const video = document.getElementById('video');
      video.srcObject = stream;
      video.play().catch(() => {});
    } catch(e) {
      alert('Kamera ochilmadi: ' + e.message + '. Iltimos Safari brauzeri sozlamalaridan kameraga ruxsat bering yoki pastdagi "Tizim kamerasi" tugmasini ishlating.');
      show('ready');
    }
  }

  function handleNativeCapture(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Foydalanuvchiga rasm qabul qilinganini ko'rsatamiz
    capturedBlob = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('preview-img').src = event.target.result;
      show('preview');
      // Avtomatik yuborishni taklif qilamiz yoki darhol yuboramiz
      console.log('Rasm yuklandi, preview ko\'rsatildi');
    };
    reader.readAsDataURL(file);
  }

  async function submitSelfie() {
    if (!capturedBlob) {
      alert('Rasm tanlanmagan!');
      return;
    }
    
    show('uploading');
    try {
      const fd = new FormData();
      fd.append('image', capturedBlob, 'selfie.jpg');
      
      console.log('Yuklash boshlandi:', BACKEND + '/kyc/face/' + TOKEN + '/upload');
      
      const upRes = await fetch(BACKEND + '/kyc/face/' + TOKEN + '/upload', { 
        method: 'POST', 
        body: fd 
      });
      
      if (!upRes.ok) throw new Error('Server rasmni qabul qilmadi (Status: ' + upRes.status + ')');
      
      const upData = await upRes.json();
      const imageUrl = upData?.data?.url || upData?.url;
      
      if (!imageUrl) throw new Error('Rasm yuklandi, lekin URL qaytmadi.');

      const subRes = await fetch(BACKEND + '/kyc/face/' + TOKEN + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfie_url: imageUrl })
      });
      
      const subData = await subRes.json();
      if (subData.success) {
        show('success');
      } else {
        throw new Error(subData.message || 'Tasdiqlashda xato.');
      }
    } catch(e) {
      alert('Xatolik: ' + e.message);
      show('ready');
    }
  }

  function showError(msg) {
    alert('Xato: ' + msg);
    document.getElementById('error-msg').textContent = msg;
    show('error');
  }

</script>
</body>
</html>`);
};

/**
 * GET /kyc/face/:token/check  (JSON — frontend polling uchun)
 */
const checkFaceToken = async (req, res) => {
  try {
    const { token } = req.params;
    const session = faceSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      return res.status(404).json({ success: false, message: 'Token yaroqsiz yoki muddati o\'tgan.' });
    }
    if (session.status === 'completed') {
      return res.json({ success: true, data: { status: 'completed' } });
    }
    return res.json({ success: true, data: { status: 'pending', expiresAt: session.expiresAt } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Xato.' });
  }
};

/**
 * POST /kyc/face/:token/submit  (auth shart emas — mobile telefon uchun)
 * Mobile: selfie rasmini yuboradi
 */
const submitFaceSelfie = async (req, res) => {
  try {
    const { token } = req.params;
    const { selfie_url } = req.body;

    if (!selfie_url) {
      return res.status(400).json({ success: false, message: 'selfie_url majburiy.' });
    }

    const session = faceSessions.get(token);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session topilmadi.' });
    }
    if (Date.now() > session.expiresAt) {
      faceSessions.delete(token);
      return res.status(410).json({ success: false, message: 'Session muddati tugagan. QR kodni yangilang.' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Bu session allaqachon yakunlangan.' });
    }

    // Agar kyc_submissions da pending submission bo'lsa selfie URL ni yangilash
    try {
      await pool.query(
        `UPDATE kyc_submissions
         SET selfie_url = $1, updated_at = NOW()
         WHERE user_id = $2 AND status = 'pending'
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [selfie_url, session.userId]
      );
    } catch { /* submission yo'q bo'lsa ham ishlaydi */ }

    // Session ni yangilash
    faceSessions.set(token, { ...session, status: 'completed', selfie_url });

    // Socket.io orqali desktopga xabar yuborish
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${session.userId}`).emit('kyc_face_completed', {
        token,
        selfie_url,
        message: 'Yuz tasdiqlash muvaffaqiyatli yakunlandi!',
      });
    }

    return res.json({
      success: true,
      message: 'Selfie muvaffaqiyatli qabul qilindi! Siz sahifani yopishingiz mumkin.',
    });
  } catch (error) {
    console.error('submitFaceSelfie error:', error);
    return res.status(500).json({ success: false, message: 'Selfie yuborishda xato.' });
  }
};

/**
 * POST /auth/kyc/submit
 * Foydalanuvchi KYC hujjatlarini topshiradi
 */
const submitKyc = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      document_type,
      document_front_url,
      document_back_url,
      selfie_url,
      full_name,
      date_of_birth,
      document_number,
      country,
    } = req.body;

    if (!document_type || !document_front_url) {
      return res.status(400).json({
        success: false,
        message: "document_type va document_front_url majburiy.",
      });
    }

    const validTypes = ['passport', 'id_card', 'driver_license'];
    if (!validTypes.includes(document_type)) {
      return res.status(400).json({
        success: false,
        message: `document_type faqat: ${validTypes.join(', ')} bo'lishi mumkin.`,
      });
    }

    // Foydalanuvchi oldingi KYC holatini tekshirish
    const userQ = await pool.query(
      `SELECT kyc_status, is_kyc_verified FROM users WHERE id = $1`,
      [userId]
    );
    const user = userQ.rows[0];

    if (user?.is_kyc_verified) {
      return res.status(400).json({
        success: false,
        message: "Siz allaqachon tasdiqlangansiz.",
      });
    }

    if (user?.kyc_status === 'pending') {
      return res.status(400).json({
        success: false,
        message: "Sizning KYC so'rovingiz ko'rib chiqilmoqda. Iltimos, kuting.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Eski pending so'rovlarni bekor qilish (rejected bo'lsa qayta yuborishga imkon)
      await client.query(
        `UPDATE kyc_submissions SET status = 'superseded' WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );

      // Yangi submission
      const subRes = await client.query(
        `INSERT INTO kyc_submissions (
          user_id, status, document_type, document_front_url,
          document_back_url, selfie_url, full_name, date_of_birth,
          document_number, country
        ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          userId, document_type, document_front_url,
          document_back_url || null, selfie_url || null,
          full_name || null, date_of_birth || null,
          document_number || null, country || null,
        ]
      );

      // users jadvalida kyc_status = pending
      await client.query(
        `UPDATE users 
         SET kyc_status = 'pending', kyc_submitted_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      // Admin ga bildirishnoma
      const io = req.app.get('io');
      const adminsQ = await pool.query(
        `SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 5`
      );
      for (const admin of adminsQ.rows) {
        createNotification(io, {
          userId: admin.id,
          type: 'kyc_submitted',
          relatedId: subRes.rows[0].id,
          relatedType: 'kyc_submission',
        });
      }

      return res.json({
        success: true,
        message: "KYC so'rovingiz qabul qilindi. 1-3 ish kuni ichida ko'rib chiqiladi.",
        data: { submission_id: subRes.rows[0].id },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('KYC submit error:', error);
    return res.status(500).json({
      success: false,
      message: "KYC yuborishda xato.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /auth/kyc/status
 * Foydalanuvchi o'z KYC holatini ko'radi
 */
const getKycStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const userQ = await pool.query(
      `SELECT is_kyc_verified, kyc_status, kyc_submitted_at, kyc_reviewed_at, kyc_reject_reason
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userQ.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi." });
    }

    const user = userQ.rows[0];

    // Oxirgi submission
    const subQ = await pool.query(
      `SELECT id, status, document_type, submitted_at, reviewed_at, reject_reason
       FROM kyc_submissions
       WHERE user_id = $1
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [userId]
    );

    return res.json({
      success: true,
      data: {
        is_kyc_verified: user.is_kyc_verified,
        kyc_status: user.kyc_status,
        kyc_submitted_at: user.kyc_submitted_at,
        kyc_reviewed_at: user.kyc_reviewed_at,
        kyc_reject_reason: user.kyc_reject_reason,
        last_submission: subQ.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('KYC status error:', error);
    return res.status(500).json({ success: false, message: "KYC holati olishda xato." });
  }
};

/**
 * GET /admin/kyc
 * Admin: barcha pending KYC so'rovlari
 */
const getKycList = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const validStatuses = ['pending', 'approved', 'rejected', 'all'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri status." });
    }

    const whereClause = status === 'all' ? '' : `WHERE ks.status = $1`;
    const params = status === 'all' ? [limit, offset] : [status, limit, offset];
    const offsetParam = status === 'all' ? '$2' : '$3';
    const limitParam = status === 'all' ? '$1' : '$2';

    const result = await pool.query(
      `SELECT 
        ks.id,
        ks.status,
        ks.document_type,
        ks.document_front_url,
        ks.document_back_url,
        ks.selfie_url,
        ks.full_name,
        ks.date_of_birth,
        ks.document_number,
        ks.country,
        ks.submitted_at,
        ks.reviewed_at,
        ks.reject_reason,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.username,
        u.role,
        u.avatar_url,
        u.is_kyc_verified,
        u.kyc_status
       FROM kyc_submissions ks
       JOIN users u ON u.id = ks.user_id
       ${whereClause}
       ORDER BY ks.submitted_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM kyc_submissions ${status === 'all' ? '' : 'WHERE status = $1'}`,
      status === 'all' ? [] : [status]
    );

    return res.json({
      success: true,
      data: {
        submissions: result.rows,
        total: countResult.rows[0]?.total || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('KYC list error:', error);
    return res.status(500).json({ success: false, message: "KYC ro'yxatini olishda xato." });
  }
};

/**
 * POST /admin/kyc/:submissionId/approve
 * Admin: KYC ni tasdiqlaydi
 */
const approveKyc = async (req, res) => {
  const adminId = req.user.id;
  const { submissionId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Submission mavjudmi?
    const subQ = await client.query(
      `SELECT ks.id, ks.user_id, ks.status
       FROM kyc_submissions ks
       WHERE ks.id = $1 FOR UPDATE`,
      [submissionId]
    );

    if (subQ.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "KYC submission topilmadi." });
    }

    const sub = subQ.rows[0];

    if (sub.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Bu submission allaqachon ${sub.status} holgatida.`,
      });
    }

    // Submission ni tasdiqlash
    await client.query(
      `UPDATE kyc_submissions
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1, reject_reason = NULL
       WHERE id = $2`,
      [adminId, submissionId]
    );

    // User ni tasdiqlash
    await client.query(
      `UPDATE users
       SET is_kyc_verified = TRUE,
           kyc_status = 'approved',
           kyc_reviewed_at = NOW(),
           kyc_reviewed_by = $1,
           kyc_reject_reason = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [adminId, sub.user_id]
    );

    await client.query('COMMIT');

    // Foydalanuvchiga bildirishnoma
    const io = req.app.get('io');
    createNotification(io, {
      userId: sub.user_id,
      type: 'kyc_approved',
      relatedId: submissionId,
      relatedType: 'kyc_submission',
    });

    return res.json({
      success: true,
      message: "KYC muvaffaqiyatli tasdiqlandi! Foydalanuvchi 'Tasdiqlangan' badge oldi.",
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('KYC approve error:', error);
    return res.status(500).json({ success: false, message: "KYC tasdiqlashda xato." });
  } finally {
    client.release();
  }
};

/**
 * POST /admin/kyc/:submissionId/reject
 * Admin: KYC ni rad etadi
 */
const rejectKyc = async (req, res) => {
  const adminId = req.user.id;
  const { submissionId } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: "Rad etish sababi (reason) majburiy.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const subQ = await client.query(
      `SELECT id, user_id, status FROM kyc_submissions WHERE id = $1 FOR UPDATE`,
      [submissionId]
    );

    if (subQ.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Submission topilmadi." });
    }

    const sub = subQ.rows[0];

    if (sub.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Bu submission allaqachon ${sub.status} holatida.`,
      });
    }

    await client.query(
      `UPDATE kyc_submissions
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, reject_reason = $2
       WHERE id = $3`,
      [adminId, reason.trim(), submissionId]
    );

    await client.query(
      `UPDATE users
       SET kyc_status = 'rejected',
           is_kyc_verified = FALSE,
           kyc_reviewed_at = NOW(),
           kyc_reviewed_by = $1,
           kyc_reject_reason = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [adminId, reason.trim(), sub.user_id]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    createNotification(io, {
      userId: sub.user_id,
      type: 'kyc_rejected',
      relatedId: submissionId,
      relatedType: 'kyc_submission',
    });

    return res.json({
      success: true,
      message: "KYC rad etildi. Foydalanuvchi qayta topshirishi mumkin.",
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('KYC reject error:', error);
    return res.status(500).json({ success: false, message: "KYC rad etishda xato." });
  } finally {
    client.release();
  }
};

module.exports = {
  submitKyc,
  getKycStatus,
  getKycList,
  approveKyc,
  rejectKyc,
  createFaceSession,
  getFaceSessionStatus,
  serveMobilePage,
  checkFaceToken,
  submitFaceSelfie,
};

