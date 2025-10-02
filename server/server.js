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

// Simple in-memory stores (use DB/Redis in production)
const pending = new Map();
const confirmed = new Map();

// Setup nodemailer transport using SMTP from env
const transportOptions = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: (process.env.SMTP_SECURE === 'true'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

const transporter = nodemailer.createTransport(transportOptions);

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function genId() { return crypto.randomBytes(12).toString('hex'); }
function maskEmail(email) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  let local = parts[0];
  const domain = parts[1];
  if (local.length <= 2) local = local[0] + '*';
  else local = local[0] + '*'.repeat(Math.max(0, local.length - 2)) + local.slice(-1);
  return local + '@' + domain;
}

// POST /api/send-code
app.post('/api/send-code', async (req, res) => {
  try {
    const { email, studentId, university } = req.body || {};
    if (!email || !studentId || !university) return res.status(400).json({ error: 'email, studentId and university are required' });

    const code = genCode();
    const orderId = genId();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const entry = { email, studentId, university, code, expiresAt, createdAt: Date.now() };
    pending.set(orderId, entry);

    // Send email via SMTP
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const msg = {
      from: from,
      to: email,
      subject: 'Your TranscriptEase verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`
    };

    await transporter.sendMail(msg);

    return res.json({ ok: true, orderId: orderId, maskedEmail: maskEmail(email), expiresAt: entry.expiresAt });
  } catch (err) {
    console.error('send-code error', err);
    return res.status(500).json({ error: 'failed to send code' });
  }
});

// POST /api/resend/:orderId
app.post('/api/resend/:orderId', async (req, res) => {
  try {
    const id = req.params.orderId;
    const entry = pending.get(id);
    if (!entry) return res.status(404).json({ error: 'pending order not found' });

    const newCode = genCode();
    entry.code = newCode;
    entry.expiresAt = Date.now() + 10 * 60 * 1000;
    entry.createdAt = Date.now();

    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const msg = {
      from: from,
      to: entry.email,
      subject: 'Your TranscriptEase verification code (resent)',
      text: `Your verification code is ${newCode}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong>${newCode}</strong>. It expires in 10 minutes.</p>`
    };

    await transporter.sendMail(msg);
    return res.json({ ok: true, maskedEmail: maskEmail(entry.email), expiresAt: entry.expiresAt });
  } catch (err) {
    console.error('resend error', err);
    return res.status(500).json({ error: 'failed to resend code' });
  }
});

// GET /api/pending/:orderId
app.get('/api/pending/:orderId', (req, res) => {
  const id = req.params.orderId;
  const entry = pending.get(id);
  if (!entry) return res.status(404).json({ error: 'pending order not found' });
  return res.json({ ok: true, maskedEmail: maskEmail(entry.email), expiresAt: entry.expiresAt, university: entry.university });
});

// POST /api/verify-code
app.post('/api/verify-code', (req, res) => {
  try {
    const { orderId, code } = req.body || {};
    if (!orderId || !code) return res.status(400).json({ error: 'orderId and code required' });
    const entry = pending.get(orderId);
    if (!entry) return res.status(400).json({ error: 'pending order not found' });

    if (Date.now() > entry.expiresAt) { pending.delete(orderId); return res.status(400).json({ error: 'code expired' }); }
    if (String(code) !== String(entry.code)) return res.status(400).json({ error: 'invalid code' });

    // Move to confirmed
    const confirmedEntry = Object.assign({}, entry, { verifiedAt: Date.now() });
    confirmed.set(orderId, confirmedEntry);
    pending.delete(orderId);

    return res.json({ ok: true, message: 'verified', confirmed: { university: confirmedEntry.university } });
  } catch (err) {
    console.error('verify error', err);
    return res.status(500).json({ error: 'verification failed' });
  }
});

app.listen(PORT, () => console.log('SMTP mailer running on port', PORT));
