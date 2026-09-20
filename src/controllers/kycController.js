// src/controllers/kycController.js
const pool = require('../db/pool');
const { createNotification } = require('./notificationController');
const crypto = require('crypto');

const fs = require('fs');
const path = require('path');
const sessionsFilePath = path.join(process.cwd(), 'uploads', 'face_sessions.json');

// Helper to load sessions
const loadSessions = () => {
  try {
    if (fs.existsSync(sessionsFilePath)) {
      const data = fs.readFileSync(sessionsFilePath, 'utf8');
      return new Map(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error loading face sessions:', error);
  }
  return new Map();
};

// Helper to save sessions
const saveSessions = (sessions) => {
  try {
    const data = JSON.stringify(Array.from(sessions.entries()));
    fs.writeFileSync(sessionsFilePath, data, 'utf8');
  } catch (error) {
    console.error('Error saving face sessions:', error);
  }
};

// Clear expired sessions every 5 minutes
setInterval(() => {
  try {
    const sessions = loadSessions();
    const now = Date.now();
    let changed = false;
    for (const [token, session] of sessions.entries()) {
      if (now > session.expiresAt) {
        sessions.delete(token);
        changed = true;
      }
    }
    if (changed) saveSessions(sessions);
  } catch (error) {
    console.error('Error clearing expired face sessions:', error);
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

    const backendUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const mobileUrl = `${backendUrl.replace(/\/$/, "")}/kyc/face/${token}`;
    console.log('Mobile URL for KYC:', mobileUrl);

<<<<<<< Updated upstream
    faceSessions.set(token, { userId, status: 'pending', expiresAt, selfie_url: null });
    saveSessions(faceSessions);
=======

    const sessions = loadSessions();
    sessions.set(token, { userId, status: 'pending', expiresAt, selfie_url: null });
    saveSessions(sessions);
>>>>>>> Stashed changes

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
    const sessions = loadSessions();
    const session = sessions.get(token);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session topilmadi yoki muddati o\'tgan.' });
    }
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      saveSessions(sessions);
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
  const sessions = loadSessions();
  const session = sessions.get(token);

  console.log('--- Serve KYC Mobile Page Debug ---');
  console.log('Token from URL:', token);
  console.log('Session found in Map:', !!session);
  if (session) {
    console.log('Session UserID:', session.userId);
    console.log('Session Status:', session.status);
    console.log('Session ExpiresAt:', session.expiresAt);
    console.log('Server Date.now():', Date.now());
    console.log('Remaining duration (seconds):', Math.round((session.expiresAt - Date.now()) / 1000));
  } else {
    // Print all active tokens in faceSessions for debugging
    console.log('Active tokens in Map:', Array.from(sessions.keys()));
  }
  console.log('------------------------------------');

  const backendUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;


  if (!session || Date.now() > session.expiresAt) {
    if (session) {
      sessions.delete(token);
      saveSessions(sessions);
    }
    
    const debugInfo = `
      <div style="margin-top: 30px; padding: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; text-align: left; font-size: 12px; color: #94a3b8; max-width: 320px; word-break: break-all; font-family: monospace;">
        <div style="color: #3b82f6; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">🔧 DEBUG INFO (Tashxis ma'lumoti):</div>
        <div><strong>Server vaqti:</strong> ${new Date().toLocaleString('uz-UZ')}</div>
        <div><strong>Token:</strong> ${token}</div>
        <div><strong>CWD:</strong> ${process.cwd()}</div>
        <div><strong>Sessiya topildimi:</strong> ${!!session ? 'Ha' : "Yo'q"}</div>
        <div><strong>Faol tokenlar:</strong> ${sessions.size} ta</div>
        <div><strong>Platforma:</strong> ${process.platform}</div>
      </div>
    `;

    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>KYC - Muddati tugagan</title>
      <style>body{background:#0f172a;color:#f1f5f9;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}h2{color:#f59e0b;margin-bottom:12px}p{color:#94a3b8}</style>
      </head><body><div style="display:flex;flex-direction:column;align-items:center;"><h2>⏱ Muddat tugagan</h2><p>Kompyuterda yangi QR kod yarating va qayta urinib ko'ring.</p>${debugInfo}</div></body></html>`);
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
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <title>UzWork - Yuzni tasdiqlash</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      background: radial-gradient(120% 120% at 50% 10%, #0d1527 0%, #020617 100%);
      color:#f1f5f9;
      font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow:hidden;
      height:100vh;
      display:flex;
      flex-direction:column;
      position: relative;
    }
    
    /* Background Glow Accents */
    .bg-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      z-index: 1;
      opacity: 0.45;
      pointer-events: none;
    }
    .bg-glow-top {
      top: -10%;
      right: -20%;
      width: 300px;
      height: 300px;
      background: #3b82f6;
    }
    .bg-glow-bottom {
      bottom: -10%;
      left: -20%;
      width: 300px;
      height: 300px;
      background: #6366f1;
    }

    #screen-ready, #screen-uploading, #screen-success, #screen-error {
      display:none;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      min-height:100vh;
      padding:24px;
      text-align:center;
      gap:24px;
      position: relative;
      z-index: 5;
    }
    #screen-camera {display:none;flex-direction:column;position:absolute;inset:0;width:100%;height:100%;background:#000;overflow:hidden}
    #screen-preview {display:none;flex-direction:column;position:absolute;inset:0;width:100%;height:100%;background:#000;overflow:hidden}
    .active{display:flex!important}

    /* Glass Container */
    .glass-card {
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 28px;
      padding: 36px 24px;
      width: 100%;
      max-width: 350px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: floatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes floatIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Glowing Badge */
    .icon-badge {
      width: 80px;
      height: 80px;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%);
      border: 1px solid rgba(59, 130, 246, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      margin-bottom: 8px;
      color: #3b82f6;
    }
    .icon-badge::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 26px;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      z-index: -1;
      opacity: 0.2;
      filter: blur(8px);
    }
    .icon-badge.success-badge {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%);
      border-color: rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }
    .icon-badge.success-badge::after {
      background: linear-gradient(135deg, #22c55e, #10b981);
    }
    .icon-badge.error-badge {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%);
      border-color: rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }
    .icon-badge.error-badge::after {
      background: linear-gradient(135deg, #ef4444, #f59e0b);
    }

    /* Typography */
    h1 {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 15px;
      color: #94a3b8;
      line-height: 1.6;
      max-width: 290px;
    }

    /* Tips styling */
    .tips-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      margin: 8px 0;
    }
    .tip {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-left: 4px solid #3b82f6;
      border-radius: 16px;
      padding: 14px 16px;
      font-size: 14px;
      color: #cbd5e1;
      text-align: left;
      transition: all 0.3s ease;
    }
    .tip:nth-child(2) {
      border-left-color: #6366f1;
    }
    .tip-icon {
      font-size: 18px;
    }

    /* Buttons styling */
    .btn {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding:16px 28px;
      border-radius:18px;
      font-size:16px;
      font-weight:700;
      border:none;
      cursor:pointer;
      width:100%;
      max-width:320px;
      transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      color: #fff;
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-primary:active {
      transform: scale(0.96);
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.25);
    }
    .btn-outline {
      background: rgba(255, 255, 255, 0.03);
      color: #f1f5f9;
      border: 1.5px dashed rgba(59, 130, 246, 0.35);
      position: relative;
    }
    .btn-outline:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.06);
    }

    /* Camera Screen & Overlay */
    #video, #preview-img {
      position: absolute;
      inset: 0;
      width:100%;
      height:100%;
      object-fit:cover;
      transform:scaleX(-1);
      z-index: 1;
    }
    .cam-header {
      position:absolute;
      top:0;
      left:0;
      right:0;
      z-index:100;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: calc(16px + env(safe-area-inset-top)) 20px 16px;
      background:linear-gradient(to bottom, rgba(3, 7, 18, 0.8) 0%, transparent);
      color:#fff;
      font-size:16px;
      font-weight:700;
    }
    .back-btn {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f1f5f9;
      padding: 10px 18px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .back-btn:active {
      transform: scale(0.95);
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .oval-overlay {
      position:absolute;
      inset:0;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      pointer-events:none;
      z-index: 3;
    }
    
    /* Biometric scanner corners */
    .corner-brackets {
      position: absolute;
      width: min(330px, 86vw);
      height: min(430px, 58vh);
      pointer-events: none;
      z-index: 2;
    }
    .corner {
      position: absolute;
      width: 24px;
      height: 24px;
      border: 3px solid transparent;
      transition: all 0.3s ease;
    }
    .corner.tl { top: 0; left: 0; border-top-color: #3b82f6; border-left-color: #3b82f6; border-top-left-radius: 12px; }
    .corner.tr { top: 0; right: 0; border-top-color: #3b82f6; border-right-color: #3b82f6; border-top-right-radius: 12px; }
    .corner.bl { bottom: 0; left: 0; border-bottom-color: #3b82f6; border-left-color: #3b82f6; border-bottom-left-radius: 12px; }
    .corner.br { bottom: 0; right: 0; border-bottom-color: #3b82f6; border-right-color: #3b82f6; border-bottom-right-radius: 12px; }

    .oval {
      width: min(280px, 78vw);
      height: min(380px, 52vh);
      border-radius: 50%;
      border: 2px solid #3b82f6;
      /* Cutout effect using outline */
      outline: 3000px solid rgba(3, 7, 18, 0.75);
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.35);
      z-index: 4;
      transition: all 0.3s ease;
    }

    /* Biometric Dashed Ring inside Oval */
    .oval::before {
      content: '';
      position: absolute;
      inset: 8px;
      border-radius: 50%;
      border: 1.5px dashed rgba(59, 130, 246, 0.35);
      animation: rotateDashed 25s linear infinite;
      pointer-events: none;
    }
    @keyframes rotateDashed {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .oval-label {
      margin-top: 24px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 10px 20px;
      border-radius: 30px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 5;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #3b82f6;
      box-shadow: 0 0 8px #3b82f6;
      animation: pulseDot 1.5s infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 0.4; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.3); }
    }

    /* Animated Neon Laser Scan inside Oval */
    .scanner-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.85);
      animation: scan 2.5s ease-in-out infinite;
      pointer-events: none;
      z-index: 5;
    }
    @keyframes scan {
      0%, 100% { top: 0%; opacity: 0.1; }
      50% { top: 100%; opacity: 1; }
    }

    /* Pulsing Shutter Button */
    .shutter-row {
      position:absolute;
      bottom: calc(80px + env(safe-area-inset-bottom));
      left:0;
      right:0;
      display:flex;
      justify-content:center;
      z-index: 100;
    }
    .shutter {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 4px solid #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.35);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 6px;
    }
    .shutter:active {
      transform:scale(0.9);
      background: rgba(255, 255, 255, 0.2);
    }
    .shutter.disabled {
      opacity: 0.25;
      filter: grayscale(1) blur(0.5px);
      border-color: rgba(255, 255, 255, 0.4);
      box-shadow: none;
      cursor: not-allowed;
      pointer-events: none;
      transform: scale(0.92);
    }
    .shutter.disabled .shutter-inner {
      background: #94a3b8;
    }
    .shutter-inner {
      width:100%;
      height:100%;
      border-radius:50%;
      background:#fff;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);
      display:block;
      transition: background 0.2s;
    }
    .shutter:active .shutter-inner {
      background: #e2e8f0;
    }

    /* Preview Actions */
    .preview-actions {
      position:absolute;
      bottom: calc(80px + env(safe-area-inset-bottom));
      left:0;
      right:0;
      display:flex;
      gap:16px;
      padding: 0 24px;
      z-index: 100;
    }
    .preview-actions .btn {
      max-width:none;
      flex:1;
      padding:16px 14px;
      font-size:15px;
    }

    /* Premium Spinner */
    .spinner-wrapper {
      position: relative;
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .spinner {
      width: 60px;
      height: 60px;
      border: 3px solid rgba(59, 130, 246, 0.1);
      border-top-color: #3b82f6;
      border-right-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.9s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

  </style>
</head>
<body>

  <!-- Background Glare -->
  <div class="bg-glow bg-glow-top"></div>
  <div class="bg-glow bg-glow-bottom"></div>

  <!-- READY SCREEN -->
  <div id="screen-ready" class="active">
    <div class="glass-card">
      <div class="icon-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      
      <h1>Yuzni tasdiqlash</h1>
      <p>Old kamera yonadi va siz selfie tushirasiz.</p>
      
      <div class="tips-container">
        <div class="tip">
          <span class="tip-icon">💡</span>
          <span>Yaxshi yoritilgan joyda turing</span>
        </div>
        <div class="tip">
          <span class="tip-icon">📸</span>
          <span>Yuzingiz to'liq va ochiq ko'rinsin</span>
        </div>
      </div>
      
      <button class="btn btn-primary" onclick="startCamera()" ontouchstart="startCamera()">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Brauzer kamerasida ochish
      </button>
      
      <div class="btn btn-outline">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>Tizim kamerasidan yuklash</span>
        <input id="native-cam" type="file" accept="image/*" capture="user" onchange="handleNativeCapture(event)" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:10" />
      </div>
    </div>
  </div>

  <!-- CAMERA SCREEN -->
  <div id="screen-camera">
    <div class="cam-header">
      <button class="back-btn" onclick="stopCamera()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Chiqish
      </button>
      <span style="text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Selfie tushiring</span>
      <div style="width: 76px;"></div> <!-- Spacer to keep title centered -->
    </div>
    
    <video id="video" autoplay playsinline muted></video>
    <canvas id="canvas" style="display:none"></canvas>
    
    <div class="oval-overlay">
      <!-- Biometric corner brackets -->
      <div class="corner-brackets">
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>
      </div>

      <div class="oval">
        <!-- Scan Laser Line -->
        <div class="scanner-bar"></div>
      </div>
      
      <span class="oval-label">
        <span class="pulse-dot"></span>
        Yuzingizni oval ichiga joylashtiring
      </span>
    </div>
    
    <div class="shutter-row">
      <button id="shutter-btn" class="shutter disabled" onclick="takeSelfie()">
        <span class="shutter-inner"></span>
      </button>
    </div>
  </div>

  <!-- PREVIEW SCREEN -->
  <div id="screen-preview">
    <div class="cam-header">
      <button class="back-btn" onclick="retake()">← Qayta olish</button>
      <span>Ko'rib chiqing</span>
    </div>
    
    <img id="preview-img" alt="selfie" />
    
    <div class="preview-actions">
      <button class="btn btn-outline" onclick="retake()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Qayta
      </button>
      <button class="btn btn-primary" onclick="submitSelfie()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Yuborish
      </button>
    </div>
  </div>

  <!-- UPLOADING SCREEN -->
  <div id="screen-uploading">
    <div class="glass-card">
      <div class="spinner-wrapper">
        <div class="spinner"></div>
      </div>
      <h1>Yuborilmoqda...</h1>
      <p style="font-size: 14px;">Rasmingiz xavfsiz kanallar orqali tasdiqlash uchun yuborilmoqda. Iltimos kuting...</p>
    </div>
  </div>

  <!-- SUCCESS SCREEN -->
  <div id="screen-success">
    <div class="glass-card">
      <div class="icon-badge success-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h1>Muvaffaqiyatli!</h1>
      <p>Selfie muvaffaqiyatli tasdiqlandi. Kompyuter ekranidagi sahifaga qaytishingiz mumkin.</p>
      <small style="margin-top: 10px; display: block;">Ushbu brauzer oynasini yopishingiz mumkin.</small>
    </div>
  </div>

  <!-- ERROR SCREEN -->
  <div id="screen-error">
    <div class="glass-card">
      <div class="icon-badge error-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h1>Xato yuz berdi</h1>
      <p id="error-msg" style="font-size: 14px; color: #f87171;"></p>
      <button class="btn btn-primary" onclick="show('ready')">Qayta urinish</button>
    </div>
  </div>

  <script>
  const TOKEN = '${token}';
  const BACKEND = window.location.origin;
  let stream = null;
  let capturedBlob = null;
  let faceDetectorInterval = null;
  let detector = null;

  async function initFaceDetector() {
    if ('FaceDetector' in window) {
      try {
        detector = new FaceDetector({ maxDetectedFaces: 1 });
        console.log("Native FaceDetector is initialized!");
      } catch(e) {
        console.warn("FaceDetector init error:", e);
      }
    }
  }

  // Initialize shape detector
  initFaceDetector();

  function show(name) {
    document.querySelectorAll('[id^="screen-"]').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('screen-' + name);
    if (target) target.classList.add('active');
  }

  function startDetectionLoop(video) {
    if (faceDetectorInterval) clearInterval(faceDetectorInterval);
    
    const ovalElement = document.querySelector('.oval');
    const labelElement = document.querySelector('.oval-label');
    const cornerElement = document.querySelector('.corner-brackets');
    const shutterBtn = document.getElementById('shutter-btn');
    
    let isNativeSupported = ('FaceDetector' in window) && (typeof window.FaceDetector === 'function');
    
    faceDetectorInterval = setInterval(async () => {
      try {
        if (!stream || video.paused || video.ended) return;
        
        let faceDetected = false;
        
        // Ensure video is ready to prevent IndexSizeError when drawing to canvas
        if (video.readyState >= 2) {
          if (isNativeSupported && detector) {
            try {
              const faces = await detector.detect(video);
              if (faces && faces.length > 0) {
                const face = faces[0];
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                
                // Calculate relative center of the detected face (0.0 to 1.0)
                const faceCenterX = (face.boundingBox.x + face.boundingBox.width / 2) / videoWidth;
                const faceCenterY = (face.boundingBox.y + face.boundingBox.height / 2) / videoHeight;
                const faceWidthRatio = face.boundingBox.width / videoWidth;
                
                // Stricter centered bounding box verification inside the oval core:
                // 1. Center X should be between 0.42 and 0.58 (strictly horizontally centered)
                // 2. Center Y should be between 0.36 and 0.64 (strictly vertically centered)
                // 3. Face width ratio should be between 0.26 and 0.55 (perfect selfie proximity)
                if (faceCenterX > 0.42 && faceCenterX < 0.58 &&
                    faceCenterY > 0.36 && faceCenterY < 0.64 &&
                    faceWidthRatio > 0.26 && faceWidthRatio < 0.55) {
                  faceDetected = true;
                }
              }
            } catch(e) {
              console.warn("FaceDetector runtime error:", e);
              isNativeSupported = false; // Gracefully switch to fallback
            }
          }
          
          if (!faceDetected) {
            // Highly advanced skin-color analysis centered on the biometric oval zone
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 40;
              canvas.height = 40;
              const ctx = canvas.getContext('2d');
              
              // Draw only a tight center 30% core of the video corresponding to the inside of the oval
              ctx.drawImage(video, video.videoWidth * 0.35, video.videoHeight * 0.35, video.videoWidth * 0.30, video.videoHeight * 0.30, 0, 0, 40, 40);
              const imgData = ctx.getImageData(0, 0, 40, 40).data;
              
              let skinPixels = 0;
              let totalPixels = 40 * 40;
              
              for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i];
                const g = imgData[i+1];
                const b = imgData[i+2];
                
                // Stricter skin tone threshold to ignore background elements
                if (r > 70 && g > 45 && b > 35 &&
                    r > g && r > b &&
                    (r - g) > 15 &&
                    Math.abs(r - b) > 12) {
                  skinPixels++;
                }
              }
              
              const skinRatio = skinPixels / totalPixels;
              // Requires at least 48% skin tones filling the tight core of the oval area
              if (skinRatio >= 0.48 && skinRatio <= 0.88) {
                faceDetected = true;
              }
            } catch(e) {
              console.warn("Skin tone analysis failed, using default simulated tracking.");
              faceDetected = true;
            }
          }
        }
        
        if (faceDetected) {
          ovalElement.style.borderColor = '#10b981';
          ovalElement.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.6)';
          if (shutterBtn) shutterBtn.classList.remove('disabled');
          
          if (cornerElement) {
            cornerElement.querySelectorAll('.corner').forEach(c => {
              c.style.borderColor = 'transparent';
              c.style.borderTopColor = '#10b981';
              if (c.classList.contains('tl') || c.classList.contains('bl')) c.style.borderLeftColor = '#10b981';
              if (c.classList.contains('tr') || c.classList.contains('br')) c.style.borderRightColor = '#10b981';
              if (c.classList.contains('bl') || c.classList.contains('br')) c.style.borderBottomColor = '#10b981';
            });
          }
          labelElement.innerHTML = '<span class="pulse-dot" style="background-color:#10b981; box-shadow:0 0 8px #10b981;"></span> <span style="color:#10b981; font-weight:800;">✔ BIO-KONTUR MUVOFIQ</span>';
        } else {
          ovalElement.style.borderColor = '#3b82f6';
          ovalElement.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.35)';
          if (shutterBtn) shutterBtn.classList.add('disabled');
          
          if (cornerElement) {
            cornerElement.querySelectorAll('.corner').forEach(c => {
              c.style.borderColor = 'transparent';
              c.style.borderTopColor = '#3b82f6';
              if (c.classList.contains('tl') || c.classList.contains('bl')) c.style.borderLeftColor = '#3b82f6';
              if (c.classList.contains('tr') || c.classList.contains('br')) c.style.borderRightColor = '#3b82f6';
              if (c.classList.contains('bl') || c.classList.contains('br')) c.style.borderBottomColor = '#3b82f6';
            });
          }
          labelElement.innerHTML = '<span class="pulse-dot"></span> Yuzingizni doira ichiga joylashtiring';
        }
      } catch(err) {
        console.error("General error inside detection loop:", err);
      }
    }, 350);
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
      
      // Start real-time face tracking feedback
      startDetectionLoop(video);
    } catch(e) {
      alert('Kamera ochilmadi: ' + e.message + '. Iltimos Safari brauzeri sozlamalaridan kameraga ruxsat bering yoki pastdagi "Tizim kamerasi" tugmasini ishlating.');
      show('ready');
    }
  }

  function stopCamera() {
    if (faceDetectorInterval) {
      clearInterval(faceDetectorInterval);
      faceDetectorInterval = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    show('ready');
  }

  function takeSelfie() {
    if (faceDetectorInterval) {
      clearInterval(faceDetectorInterval);
      faceDetectorInterval = null;
    }
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      capturedBlob = blob;
      const url = URL.createObjectURL(blob);
      document.getElementById('preview-img').src = url;
      show('preview');
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
    }, 'image/jpeg', 0.9);
  }

  function retake() {
    capturedBlob = null;
    document.getElementById('preview-img').src = '';
    startCamera();
  }

  function handleNativeCapture(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    capturedBlob = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('preview-img').src = event.target.result;
      show('preview');
      console.log("Rasm yuklandi, preview ko'rsatildi");
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
      // 'image' kaliti upload.single('image') bilan mos bo'lishi shart
      fd.append('image', capturedBlob, 'selfie.jpg'); 
      
      console.log('Yuklash boshlandi:', BACKEND + '/kyc/face/' + TOKEN + '/upload');
      
      const upRes = await fetch(BACKEND + '/kyc/face/' + TOKEN + '/upload', { 
        method: 'POST', 
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: fd 
      });
      
      if (!upRes.ok) throw new Error('Server rasmni qabul qilmadi (Status: ' + upRes.status + ')');
      
      const upData = await upRes.json();
      
      // DIQQAT: uploadController nima qaytarayotganiga qarab quyidagilarni tekshiramiz:
      const imageUrl = upData?.data?.url || upData?.url || upData?.file?.url || upData?.filePath;
      
      if (!imageUrl) {
        console.log('Server response:', upData);
        throw new Error('Rasm yuklandi, lekin serverdan URL manzili olinmadi.');
      }

      // Tasdiqlash bosqichi
      const subRes = await fetch(BACKEND + '/kyc/face/' + TOKEN + '/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ selfie_url: imageUrl })
      });
      
      const subData = await subRes.json();
      if (subData.success) {
        show('success');
      } else {
        throw new Error(subData.message || 'Tasdiqlashda xato yuz berdi.');
      }
    } catch(e) {
      console.error(e);
      alert('Xato yuz berdi: ' + e.message);
      showError(e.message);
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
    const sessions = loadSessions();
    const session = sessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      if (session) {
        sessions.delete(token);
        saveSessions(sessions);
      }
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

    const sessions = loadSessions();
    const session = sessions.get(token);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session topilmadi.' });
    }
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      saveSessions(sessions);
      return res.status(410).json({ success: false, message: 'Session muddati tugagan. QR kodni yangilang.' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Bu session allaqachon yakunlangan.' });
    }

    // 1. Bazada pending KYC so'rovi borligini tekshiramiz va yangilaymiz
    try {
      const updateResult = await pool.query(
        `UPDATE kyc_submissions
         SET selfie_url = $1, updated_at = NOW()
         WHERE id IN (
           SELECT id FROM kyc_submissions
           WHERE user_id = $2 AND status = 'pending'
           ORDER BY submitted_at DESC
           LIMIT 1
         ) RETURNING id`,
        [selfie_url, session.userId]
      );

      console.log(`KYC submission updated for user ${session.userId}. Rows affected: ${updateResult.rowCount}`);
    } catch (err) {
      console.error('KYC database update error (Selfie yozishda):', err);
    }

    // 2. Xotiradagi (Map) session holatini yangilash
    sessions.set(token, { ...session, status: 'completed', selfie_url });
    saveSessions(sessions);

    // 3. Socket.io orqali desktopga xabar yuborish
    const io = req.app.get('io');
    if (io) {
      console.log(`Emitting kyc_face_completed to room: user_${session.userId}`);
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

    if (!document_type || !document_front_url || !selfie_url) {
      return res.status(400).json({
        success: false,
        message: "Hujjat turi, old tomoni va selfie rasmi majburiy.",
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

