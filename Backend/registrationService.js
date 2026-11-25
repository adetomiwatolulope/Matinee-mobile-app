const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { enqueueVerificationEmailJob } = require('./emailJobs');

const BCRYPT_ROUNDS = 12;
const IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;
const PENDING_STATUS = 'pending';
const COMPLETED_STATUS = 'completed';
const FAILED_STATUS = 'failed';

function hashRegistrationRequest({ name, email, password }) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([email, name, password]))
    .digest('hex');
}

function makeResponse(status, body) {
  return { status, body };
}

function isUniqueViolation(error) {
  return !!error && error.code === 'P2002';
}

function replayResponse(record) {
  const body = typeof record.responseJson === 'string'
    ? JSON.parse(record.responseJson)
    : record.responseJson;
  return makeResponse(record.responseStatus, body);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

function inProgressResponse() {
  return makeResponse(409, {
    error: 'registration already in progress',
    retryable: true,
  });
}

function keyReuseResponse() {
  return makeResponse(409, {
    error: 'idempotency key already used with a different request',
  });
}

async function loadIdempotencyRecord(prisma, key) {
  return prisma.registrationIdempotency.findUnique({ where: { key } });
}

async function claimIdempotency(prisma, { key, requestHash, now }) {
  const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_MS);

  try {
    await prisma.registrationIdempotency.create({
      data: {
        key,
        requestHash,
        status: PENDING_STATUS,
        expiresAt,
      },
    });
    return { claimed: true };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const existing = await loadIdempotencyRecord(prisma, key);
  if (!existing) throw new Error('idempotency record disappeared during registration');
  if (existing.requestHash !== requestHash) {
    return { claimed: false, response: keyReuseResponse() };
  }
  if (existing.status === COMPLETED_STATUS || existing.status === FAILED_STATUS) {
    return { claimed: false, response: replayResponse(existing) };
  }
  if (existing.status !== PENDING_STATUS) {
    return { claimed: false, response: makeResponse(500, { error: 'internal error' }) };
  }
  if (existing.expiresAt > now) {
    return { claimed: false, response: inProgressResponse() };
  }

  const takeover = await prisma.registrationIdempotency.updateMany({
    where: {
      key,
      status: PENDING_STATUS,
      expiresAt: { lte: now },
    },
    data: {
      requestHash,
      status: PENDING_STATUS,
      responseStatus: null,
      responseJson: null,
      userId: null,
      completedAt: null,
      updatedAt: now,
      expiresAt,
    },
  });
  if (takeover.count === 1) return { claimed: true };

  const refreshed = await loadIdempotencyRecord(prisma, key);
  if (!refreshed) throw new Error('idempotency record disappeared during registration');
  if (refreshed.requestHash !== requestHash) {
    return { claimed: false, response: keyReuseResponse() };
  }
  if (refreshed.status === COMPLETED_STATUS || refreshed.status === FAILED_STATUS) {
    return { claimed: false, response: replayResponse(refreshed) };
  }
  return { claimed: false, response: inProgressResponse() };
}

async function finalizeIdempotency(prisma, { key, response, userId, now }) {
  const status = response.status >= 200 && response.status < 300
    ? COMPLETED_STATUS
    : FAILED_STATUS;

  await prisma.registrationIdempotency.update({
    where: { key },
    data: {
      status,
      responseStatus: response.status,
      responseJson: response.body,
      userId: userId || null,
      completedAt: now,
      updatedAt: now,
    },
  });
}

async function createOrUpdateRegistration(tx, { name, email, passwordHash, now }) {
  await tx.$executeRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
    email,
  );

  const existing = await tx.user.findUnique({ where: { email } });
  if (existing && existing.emailVerified) {
    return { conflict: true };
  }

  const verificationState = {
    name,
    passwordHash,
    emailVerified: false,
    emailVerificationCodeHash: null,
    emailVerificationExpiresAt: null,
    emailVerificationFailedAttempts: 0,
    emailVerificationJobId: null,
  };

  const user = existing
    ? await tx.user.update({
      where: { id: existing.id },
      data: verificationState,
    })
    : await tx.user.create({
      data: { email, ...verificationState },
    });

  await enqueueVerificationEmailJob(tx, user.id, { now });
  return { user };
}

async function registerCustomer(prisma, input, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const { idempotencyKey, name, email, password } = input;
  const requestHash = hashRegistrationRequest({ name, email, password });

  const claim = await claimIdempotency(prisma, {
    key: idempotencyKey,
    requestHash,
    now,
  });
  if (!claim.claimed) return claim.response;

  let response;
  let userId = null;

  try {
    const passwordHash = options.passwordHash
      || await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await prisma.$transaction((tx) => createOrUpdateRegistration(tx, {
      name,
      email,
      passwordHash,
      now,
    }));

    if (result.conflict) {
      response = makeResponse(409, { error: 'email already registered' });
    } else {
      userId = result.user.id;
      response = makeResponse(201, {
        message: 'A verification code will be sent to your email',
        user: publicUser(result.user),
        requiresVerification: true,
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      response = makeResponse(409, { error: 'email already registered' });
    } else {
      console.error('Registration error', error && error.message ? error.message : error);
      response = makeResponse(500, { error: 'internal error' });
    }
  }

  await finalizeIdempotency(prisma, { key: idempotencyKey, response, userId, now });
  return response;
}

module.exports = {
  IDEMPOTENCY_TTL_MS,
  hashRegistrationRequest,
  registerCustomer,
};
