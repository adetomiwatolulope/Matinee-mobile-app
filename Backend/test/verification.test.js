process.env.VERIFICATION_CODE_SECRET = 'test-verification-secret';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  generateVerificationCode,
  hashVerificationCode,
  verifyEmailCode,
} = require('../verificationService');

function applyUserUpdate(user, data) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && typeof value.increment === 'number') {
      user[key] = user[key] + value.increment;
    } else {
      user[key] = value;
    }
  }
}

function createUserPrisma(initialUser) {
  const user = { ...initialUser };
  return {
    user: {
      findUnique: async () => ({ ...user }),
      updateMany: async ({ data }) => {
        applyUserUpdate(user, data);
        return { count: 1 };
      },
    },
    current: user,
  };
}

test('generates a six-digit code from 32 random bytes', () => {
  const bytes = Buffer.alloc(32);
  bytes.writeUIntBE(123456, 0, 6);
  const code = generateVerificationCode(() => bytes);
  assert.equal(code, '123456');
  assert.match(code, /^\d{6}$/);
});

test('hashes verification codes with the configured secret', () => {
  const first = hashVerificationCode('123456');
  const second = hashVerificationCode('123456');
  assert.equal(first, second);
  assert.notEqual(first, hashVerificationCode('654321'));
});

test('a correct code verifies the account and clears verification state', async () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const code = '123456';
  const prisma = createUserPrisma({
    id: 'user-1',
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: false,
    emailVerificationCodeHash: hashVerificationCode(code),
    emailVerificationExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    emailVerificationFailedAttempts: 0,
    createdAt: now,
  });

  const result = await verifyEmailCode(prisma, { email: 'ada@example.com', code }, now);

  assert.equal(result.ok, true);
  assert.equal(result.user.emailVerified, true);
  assert.equal(prisma.current.emailVerified, true);
  assert.equal(prisma.current.emailVerificationCodeHash, null);
  assert.equal(prisma.current.emailVerificationFailedAttempts, 0);
});

test('the sixth incorrect attempt invalidates the code', async () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const codeHash = hashVerificationCode('123456');
  const prisma = createUserPrisma({
    id: 'user-2',
    name: 'Bola',
    email: 'bola@example.com',
    emailVerified: false,
    emailVerificationCodeHash: codeHash,
    emailVerificationExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    emailVerificationFailedAttempts: 0,
    createdAt: now,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await verifyEmailCode(prisma, { email: 'bola@example.com', code: '000000' }, now);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid');
    assert.equal(result.remainingAttempts, 5 - attempt);
  }
  const final = await verifyEmailCode(prisma, { email: 'bola@example.com', code: '000000' }, now);
  assert.equal(final.ok, false);
  assert.equal(final.reason, 'locked');
  assert.equal(prisma.current.emailVerificationCodeHash, null);
});

test('an expired code is cleared and cannot verify the account', async () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const prisma = createUserPrisma({
    id: 'user-3',
    name: 'Chidi',
    email: 'chidi@example.com',
    emailVerified: false,
    emailVerificationCodeHash: hashVerificationCode('123456'),
    emailVerificationExpiresAt: new Date(now.getTime() - 1000),
    emailVerificationFailedAttempts: 0,
    createdAt: now,
  });

  const result = await verifyEmailCode(prisma, { email: 'chidi@example.com', code: '123456' }, now);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'expired');
  assert.equal(prisma.current.emailVerificationCodeHash, null);
  assert.equal(prisma.current.emailVerified, false);
});
