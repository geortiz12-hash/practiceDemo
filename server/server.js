require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN }));

const PORT = process.env.PORT || 3000;

// Simple in-memory store for demo. Use Redis or a DB in production.
const pending = new Map();

// nodemailer transport (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: (process.env.SMTP_SECURE === 'true'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// Helper functions
function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function genId() { return crypto.randomBytes(10).toString('hex'); }
function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 2 ? local[0] + '***' + local.slice(-1) : local[0] + '*';
  return visible + '@' + domain;
}

// Verify transporter at startup (non-blocking)
transporter.verify().then(() => console.log('SMTP transporter ready')).catch(err => console.warn('SMTP verify failed:', err && err.message));

// POST /api/send-code
app.post('/api/send-code', async (req, res) => {
  const { email, studentId, university } = req.body || {};
  if (!email || !studentId || !university) return res.status(400).json({ error: 'email, studentId and university required' });

  const code = genCode();
  const orderId = genId();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  const entry = { email, studentId, university, code, expiresAt, lastResend: 0, attempts: 0 };
  pending.set(orderId, entry);

  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const mail = {
    from,
    to: email,
    subject: 'Your verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`
  };

  try {
    await transporter.sendMail(mail);
    return res.json({ ok: true, orderId, maskedEmail: maskEmail(email), expiresAt });
  } catch (err) {
    console.error('send-code error', err && err.message);
    // keep pending entry for debug but indicate failure
    return res.status(500).json({ error: 'failed to send email' });
  }
});

// POST /api/resend/:orderId (simple cooldown: 60s)
app.post('/api/resend/:orderId', async (req, res) => {
  const id = req.params.orderId;
  const e = pending.get(id);
  if (!e) return res.status(404).json({ error: 'pending not found' });
  const now = Date.now();
  if (now - (e.lastResend || 0) < 60 * 1000) return res.status(429).json({ error: 'resend cooldown, try later' });
  e.code = genCode();
  e.expiresAt = now + 10 * 60 * 1000;
  e.lastResend = now;
  try {
    await transporter.sendMail({ from: process.env.FROM_EMAIL || process.env.SMTP_USER, to: e.email, subject: 'Your verification code (resent)', text: `Your code is ${e.code}` });
    return res.json({ ok: true, maskedEmail: maskEmail(e.email), expiresAt: e.expiresAt });
  } catch (err) {
    console.error('resend error', err && err.message);
    return res.status(500).json({ error: 'failed to resend' });
  }
});

// GET /api/pending/:orderId
app.get('/api/pending/:orderId', (req, res) => {
  const id = req.params.orderId;
  const e = pending.get(id);
  if (!e) return res.status(404).json({ error: 'pending not found' });
  return res.json({ ok: true, maskedEmail: maskEmail(e.email), expiresAt: e.expiresAt, university: e.university });
});

// POST /api/verify-code
app.post('/api/verify-code', (req, res) => {
  const { orderId, code } = req.body || {};
  if (!orderId || !code) return res.status(400).json({ error: 'orderId and code required' });
  const e = pending.get(orderId);
  if (!e) return res.status(400).json({ error: 'pending not found' });
  if (Date.now() > e.expiresAt) { pending.delete(orderId); return res.status(400).json({ error: 'code expired' }); }
  if (String(code) !== String(e.code)) {
    e.attempts = (e.attempts || 0) + 1;
    return res.status(400).json({ error: 'invalid code' });
  }
  // success
  pending.delete(orderId);
  return res.json({ ok: true, message: 'verified', university: e.university });
});

app.listen(PORT, () => console.log(`SMTP verification server listening on port ${PORT}`));
