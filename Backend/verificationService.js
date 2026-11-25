const crypto = require('crypto');
const { getVerificationCodeSecret, getVerificationConfig } = require('./config');

const CODE_BYTES = 32;
const CODE_MODULUS = 1000000;
const RANDOM_LIMIT = Math.floor(0x1000000000000 / CODE_MODULUS) * CODE_MODULUS;

function defaultRandomBytes(length) {
  return crypto.randomBytes(length);
}

function generateVerificationCode(randomBytes = defaultRandomBytes) {
  let value;
  do {
    value = randomBytes(CODE_BYTES).readUIntBE(0, 6);
  } while (value >= RANDOM_LIMIT);
  return String(value % CODE_MODULUS).padStart(6, '0');
}

function hashVerificationCode(code) {
  return crypto.createHmac('sha256', getVerificationCodeSecret()).update(String(code)).digest('hex');
}

function hashesMatch(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length || leftBuffer.length === 0) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function clearedVerificationFields() {
  return {
    emailVerificationCodeHash: null,
    emailVerificationExpiresAt: null,
    emailVerificationFailedAttempts: 0,
    emailVerificationJobId: null,
  };
}

async function storeVerificationCode(prisma, userId, jobId, expiresAt, codeGenerator = generateVerificationCode) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = codeGenerator();
    const codeHash = hashVerificationCode(code);
    try {
      const result = await prisma.user.updateMany({
        where: {
          id: userId,
          emailVerified: false,
          OR: [{ emailVerificationJobId: null }, { emailVerificationJobId: jobId }],
        },
        data: {
          ...clearedVerificationFields(),
          emailVerificationCodeHash: codeHash,
          emailVerificationExpiresAt: expiresAt,
          emailVerificationFailedAttempts: 0,
          emailVerificationJobId: jobId,
        },
      });
      if (result.count !== 1) {
        throw new Error('Verification code is no longer available for this account');
      }
      return code;
    } catch (error) {
      if (error && error.code === 'P2002') continue;
      throw error;
    }
  }
  throw new Error('Could not generate a unique verification code');
}

async function clearVerificationState(prisma, userId, jobId) {
  return prisma.user.updateMany({
    where: {
      id: userId,
      ...(jobId ? { emailVerificationJobId: jobId } : {}),
    },
    data: clearedVerificationFields(),
  });
}

async function verifyEmailCode(prisma, { email, code }, now = new Date()) {
  const { maxAttempts } = getVerificationConfig();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return { ok: false, reason: 'invalid' };
  if (user.emailVerified) return { ok: false, reason: 'already_verified' };
  if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
    return { ok: false, reason: 'invalid', requiresResend: true };
  }
  if (now >= user.emailVerificationExpiresAt) {
    await prisma.user.updateMany({
      where: { id: user.id, emailVerificationCodeHash: user.emailVerificationCodeHash },
      data: clearedVerificationFields(),
    });
    return { ok: false, reason: 'expired', requiresResend: true };
  }

  const submittedHash = hashVerificationCode(code);
  if (!hashesMatch(submittedHash, user.emailVerificationCodeHash)) {
    const attempted = await prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerificationCodeHash: user.emailVerificationCodeHash,
        emailVerificationFailedAttempts: { lt: maxAttempts },
      },
      data: { emailVerificationFailedAttempts: { increment: 1 } },
    });
    if (attempted.count === 0) return { ok: false, reason: 'locked', requiresResend: true };

    const attempts = user.emailVerificationFailedAttempts + 1;
    if (attempts >= maxAttempts) {
      await prisma.user.updateMany({
        where: { id: user.id, emailVerificationCodeHash: user.emailVerificationCodeHash },
        data: clearedVerificationFields(),
      });
      return { ok: false, reason: 'locked', requiresResend: true };
    }
    return { ok: false, reason: 'invalid', remainingAttempts: maxAttempts - attempts };
  }

  const confirmed = await prisma.user.updateMany({
    where: {
      id: user.id,
      emailVerified: false,
      emailVerificationCodeHash: user.emailVerificationCodeHash,
      emailVerificationExpiresAt: { gt: now },
    },
    data: { emailVerified: true, ...clearedVerificationFields() },
  });
  if (confirmed.count !== 1) return { ok: false, reason: 'invalid', requiresResend: true };

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      createdAt: user.createdAt,
    },
  };
}

module.exports = {
  CODE_BYTES,
  clearVerificationState,
  generateVerificationCode,
  hashVerificationCode,
  hashesMatch,
  storeVerificationCode,
  verifyEmailCode,
};
