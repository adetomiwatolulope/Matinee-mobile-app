process.env.VERIFICATION_CODE_SECRET = 'test-verification-secret';
process.env.EMAIL_JOB_LEASE_MS = '60000';
process.env.VERIFICATION_CODE_TTL_MINUTES = '10';

const assert = require('node:assert/strict');
const test = require('node:test');
const { enqueueVerificationEmailJob, processPendingEmailJobs } = require('../emailJobs');

let sequence = 0;

function matchesField(value, condition) {
  if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
    if ('in' in condition) return condition.in.includes(value);
    if ('lte' in condition) return value !== null && value !== undefined && value <= condition.lte;
    if ('lt' in condition) return value !== null && value !== undefined && value < condition.lt;
    if ('gt' in condition) return value !== null && value !== undefined && value > condition.gt;
  }
  return value === condition;
}

function matchesWhere(item, where) {
  if (!where) return true;
  if ('OR' in where) {
    return where.OR.some((clause) => matchesWhere(item, clause)) && Object.entries(where).every(([key, value]) => key === 'OR' || matchesField(item[key], value));
  }
  return Object.entries(where).every(([key, value]) => matchesField(item[key], value));
}

function applyUpdate(item, data) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && typeof value.increment === 'number') {
      item[key] = (item[key] || 0) + value.increment;
    } else {
      item[key] = value;
    }
  }
}

function createFakePrisma(user) {
  const jobs = [];
  const currentUser = { ...user };

  return {
    jobs,
    currentUser,
    emailJob: {
      findMany: async ({ where, take }) => jobs.filter((job) => matchesWhere(job, where)).slice(0, take),
      findFirst: async ({ where }) => jobs.find((job) => matchesWhere(job, where)) || null,
      findUnique: async ({ where }) => jobs.find((job) => job.id === where.id) || null,
      create: async ({ data }) => {
        const job = {
          id: `job-${sequence += 1}`,
          attempts: 0,
          maxAttempts: Number(process.env.EMAIL_JOB_MAX_ATTEMPTS || 5),
          createdAt: new Date(),
          ...data,
        };
        jobs.push(job);
        return job;
      },
      update: async ({ where, data }) => {
        const job = jobs.find((item) => item.id === where.id);
        applyUpdate(job, data);
        return job;
      },
      updateMany: async ({ where, data }) => {
        const matches = jobs.filter((job) => matchesWhere(job, where));
        matches.forEach((job) => applyUpdate(job, data));
        return { count: matches.length };
      },
    },
    user: {
      findUnique: async () => ({ ...currentUser }),
      updateMany: async ({ data }) => {
        applyUpdate(currentUser, data);
        return { count: 1 };
      },
    },
  };
}

function baseUser() {
  return {
    id: 'user-1',
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: false,
    emailVerificationCodeHash: null,
    emailVerificationExpiresAt: null,
    emailVerificationFailedAttempts: 0,
    emailVerificationJobId: null,
    createdAt: new Date(),
  };
}

test('resending verification reuses the single pending durable job', async () => {
  process.env.EMAIL_JOB_MAX_ATTEMPTS = '5';
  const prisma = createFakePrisma(baseUser());
  const firstAt = new Date('2026-01-01T00:00:00Z');
  const secondAt = new Date('2026-01-01T00:01:00Z');

  await enqueueVerificationEmailJob(prisma, 'user-1', { now: firstAt });
  await enqueueVerificationEmailJob(prisma, 'user-1', { now: secondAt });

  assert.equal(prisma.jobs.length, 1);
  assert.equal(prisma.jobs[0].attempts, 0);
  assert.equal(prisma.jobs[0].reference, 'user-1');
  assert.equal(prisma.jobs[0].runAt.getTime(), secondAt.getTime());
});

test('two workers cannot both claim and send the same verification email', async () => {
  process.env.EMAIL_JOB_MAX_ATTEMPTS = '5';
  const prisma = createFakePrisma(baseUser());
  const now = new Date();
  await enqueueVerificationEmailJob(prisma, 'user-1', { now });
  const sent = [];
  const mailer = {
    sendVerificationEmail: async (message) => {
      sent.push(message);
    },
  };

  const results = await Promise.all([
    processPendingEmailJobs(prisma, { now, workerId: 'worker-a', mailer, codeGenerator: () => '123456' }),
    processPendingEmailJobs(prisma, { now, workerId: 'worker-b', mailer, codeGenerator: () => '654321' }),
  ]);

  assert.equal(sent.length, 1);
  assert.equal(prisma.jobs[0].status, 'completed');
  assert.equal(results.flat().filter((result) => result === 'sent').length, 1);
  assert.match(prisma.currentUser.emailVerificationCodeHash, /^[a-f0-9]{64}$/);
});

test('a failed job reaches manual review after the retry limit', async () => {
  process.env.EMAIL_JOB_MAX_ATTEMPTS = '1';
  const prisma = createFakePrisma(baseUser());
  const now = new Date();
  await enqueueVerificationEmailJob(prisma, 'user-1', { now });
  const mailer = {
    sendVerificationEmail: async () => {
      throw new Error('SMTP unavailable');
    },
  };

  const results = await processPendingEmailJobs(prisma, {
    now,
    workerId: 'worker-a',
    mailer,
    codeGenerator: () => '123456',
  });

  assert.deepEqual(results, ['failed']);
  assert.equal(prisma.jobs[0].status, 'manual_review');
  assert.equal(prisma.jobs[0].lastError, 'SMTP unavailable');
});
