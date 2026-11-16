require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('./database/generated/prisma');
const { hashCode, generateSixDigitCode, enqueueVerificationEmailJob, startEmailJobWorker } = require('./emailJobs');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function signToken(user) {
  const secret = process.env.TOKEN_SECRET || 'dev-secret-change-me';
  return jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '1h' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const secret = process.env.TOKEN_SECRET || 'dev-secret-change-me';
    req.user = jwt.verify(token, secret);
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    if (String(password).length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing && existing.emailVerified) {
      return res.status(409).json({ error: 'email already registered' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    let user;
    if (existing && !existing.emailVerified) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { name: String(name), passwordHash, emailVerificationAttempts: 0 },
        select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
      });
    } else {
      user = await prisma.user.create({
        data: { name: String(name), email: normalizedEmail, passwordHash },
        select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
      });
    }

    await enqueueVerificationEmailJob(prisma, user.id);
    res.status(201).json({ message: 'Verification code sent to email', user, requiresVerification: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'email and code required' });
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.emailVerified) {
      const token = signToken(user);
      return res.json({ token, user: { id: user.id, name: user.name, email: user.email, emailVerified: true } });
    }

    const maxAttempts = Number(process.env.VERIFICATION_MAX_ATTEMPTS || 6);
    if (user.emailVerificationAttempts >= maxAttempts) {
      return res.status(429).json({ error: 'Too many attempts. Please resend a new code.' });
    }
    if (!user.emailVerificationExpiresAt || new Date() > user.emailVerificationExpiresAt) {
      return res.status(400).json({ error: 'Verification code expired. Please resend a new code.' });
    }

    const providedHash = hashCode(code);
    if (providedHash !== user.emailVerificationCodeHash) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerificationAttempts: { increment: 1 } } });
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationAttempts: 0,
      },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });
    const token = signToken(verified);
    res.json({ token, user: verified });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'email already verified' });
    await enqueueVerificationEmailJob(prisma, user.id);
    res.json({ message: 'Verification code resent' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email, password required' });
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified', requiresVerification: true, email: user.email });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'not found' });
    if (!user.emailVerified) return res.status(403).json({ error: 'Email not verified', requiresVerification: true });
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';

startEmailJobWorker(prisma);

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
