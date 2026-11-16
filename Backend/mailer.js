const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendVerificationEmail({ to, name, code }) {
  const transporter = createTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'Matinee';
  const subject = `${appName} - Verify your email`;
  const text = `Hi ${name || ''},\n\nYour verification code is: ${code}\n\nEnter this code in the app to verify your email address.\n`;
  const html = `<p>Hi ${name || ''},</p><p>Your verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Enter this code in the app to verify your email address.</p>`;

  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendVerificationEmail };
