TranscriptEase SMTP server

What this server does
- Provides endpoints to send verification codes via SMTP and verify them.
- Endpoints:
  - POST /api/send-code { email, studentId, university } -> sends code, returns { orderId, maskedEmail }
  - POST /api/resend/:orderId -> resends a new code for a pending order
  - GET /api/pending/:orderId -> returns masked email and expiry for a pending order
  - POST /api/verify-code { orderId, code } -> verify the code and confirm order

Quick start (local)

1) Copy the example env and fill in your SMTP credentials:

   cd server
   copy .env.example .env    # PowerShell: copy
   # then edit .env and fill SMTP_HOST, SMTP_USER, SMTP_PASS, FROM_EMAIL, and CORS_ORIGIN

2) Install dependencies and run:

   npm install
   npm start

3) Configure frontend
- The frontend expects the server API on the same origin or that CORS_ORIGIN in .env allows your frontend origin.
- When running server locally on http://localhost:3000 you can set CORS_ORIGIN=http://localhost:5500 or similar (or * for testing only).

Security & production notes
- DO NOT commit `.env` with real credentials. Use the platform's secret manager (Render, Heroku, Railway, etc.).
- Replace the in-memory pending/confirmed Maps with Redis or a database for production so data survives restarts.
- Add HTTPS at the platform edge (most hosting providers do this automatically).
- Add monitoring, logging, and alerting for email delivery failures.
- Use a transactional email provider (SendGrid, Mailgun, Postmark) for better deliverability and analytics; these providers also offer SMTP endpoints.

Deployment suggestions
- Render / Railway / Fly / Heroku all support Node.js apps and environment variables. You can deploy the `server/` folder as a separate service and set `CORS_ORIGIN` to your GitHub Pages URL.
- If you prefer a self-hosted VM, run the server behind nginx and obtain TLS certs from Let's Encrypt.

Environment variables (fill in `.env`)
- PORT=3000
- SMTP_HOST=smtp.example.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=your-smtp-username
- SMTP_PASS=your-smtp-password
- FROM_EMAIL=you@yourdomain.com
- CORS_ORIGIN=https://your-frontend-url
- RATE_LIMIT_WINDOW_MS=900000 (15 minutes)
- RATE_LIMIT_MAX=100

If you want, I can also:
- Add express-rate-limit (already wired) and more advanced input validation.
- Convert the pending store to Redis and add example Redis config.
- Create a simple Dockerfile and deployment steps for Render or Railway.
