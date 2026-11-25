const nodemailer = require('nodemailer');
const { getBooleanEnv, getNumberEnv, getRequiredEnv } = require('./config');

let cachedTransport = null;
let cachedTransportKey = null;

function assertSmtpValue(name, value) {
  if (!value || value.startsWith('replace-') || value.startsWith('your-') || value.includes('example.com')) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function createTransport() {
  const host = assertSmtpValue('SMTP_HOST', process.env.SMTP_HOST);
  const port = getNumberEnv('SMTP_PORT', 587);
  const secure = getBooleanEnv('SMTP_SECURE', false);
  const requireTls = getBooleanEnv('SMTP_REQUIRE_TLS', false);
  const user = assertSmtpValue('SMTP_USER', process.env.SMTP_USER);
  const pass = assertSmtpValue('SMTP_PASS', process.env.SMTP_PASS);
  const key = [host, port, secure, requireTls, user].join(':');

  if (!cachedTransport || cachedTransportKey !== key) {
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: requireTls,
      auth: { user, pass },
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      tls: { minVersion: 'TLSv1.2' },
    });
    cachedTransportKey = key;
  }
  return cachedTransport;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sendVerificationEmail({ to, name, code }, transport = createTransport()) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'Matinee';
  const ttlMinutes = getNumberEnv('VERIFICATION_CODE_TTL_MINUTES', 10);
  const safeName = escapeHtml(name);
  const safeCode = String(code);
  const subject = `${appName} verification code`;
  const text = `Hi ${name || ''},\n\nYour ${appName} verification code is ${safeCode}.\n\nThis code expires in ${ttlMinutes} minutes. If you did not create an account, you can ignore this email.\n`;
  const html = `<p>Hi ${safeName},</p><p>Your ${appName} verification code is <strong>${safeCode}</strong>.</p><p>This code expires in ${ttlMinutes} minutes.</p><p>If you did not create an account, you can ignore this email.</p>`;

  await transport.sendMail({ from, to, subject, text, html });
}

module.exports = { createTransport, escapeHtml, sendVerificationEmail };
