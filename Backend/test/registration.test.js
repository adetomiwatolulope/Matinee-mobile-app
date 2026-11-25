const assert = require('node:assert/strict');
const test = require('node:test');
const {
  hashRegistrationRequest,
  registerCustomer,
} = require('../registrationService');

const BASE_INPUT = {
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
  name: 'Ada Okafor',
  email: 'ada@example.com',
  password: 'Password1@',
};

function createState() {
  return {
    idempotencyRecords: new Map(),
    jobs: [],
    users: [],
  };
}

function matchesJobFilter(job, where) {
  if (where.type && job.type !== where.type) return false;
  if (where.reference && job.reference !== where.reference) return false;
  if (where.status?.in && !where.status.in.includes(job.status)) return false;
  return true;
}

function createPrisma(state) {
  const tx = {
    $executeRawUnsafe: async () => 0,
    user: {
      findUnique: async ({ where }) => {
        const user = state.users.find((candidate) => candidate.email === where.email);
        return user ? { ...user } : null;
      },
      create: async ({ data }) => {
        const user = {
          id: `user-${state.users.length + 1}`,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          ...data,
        };
        state.users.push(user);
        return { ...user };
      },
      update: async ({ where, data }) => {
        const user = state.users.find((candidate) => candidate.id === where.id);
        Object.assign(user, data);
        return { ...user };
      },
    },
    emailJob: {
      findFirst: async ({ where }) => {
        const jobs = state.jobs
          .filter((job) => matchesJobFilter(job, where))
          .sort((left, right) => right.createdAt - left.createdAt);
        return jobs[0] ? { ...jobs[0] } : null;
      },
      create: async ({ data }) => {
        const job = {
          id: `job-${state.jobs.length + 1}`,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          ...data,
        };
        state.jobs.push(job);
        return { ...job };
      },
      update: async ({ where, data }) => {
        const job = state.jobs.find((candidate) => candidate.id === where.id);
        Object.assign(job, data);
        return { ...job };
      },
    },
  };

  const prisma = {
    ...tx,
    registrationIdempotency: {
      create: async ({ data }) => {
        if (state.idempotencyRecords.has(data.key)) {
          const error = new Error('unique violation');
          error.code = 'P2002';
          throw error;
        }
        const record = { ...data };
        state.idempotencyRecords.set(record.key, record);
        return { ...record };
      },
      findUnique: async ({ where }) => {
        const record = state.idempotencyRecords.get(where.key);
        return record ? { ...record } : null;
      },
      updateMany: async ({ where, data }) => {
        const record = state.idempotencyRecords.get(where.key);
        if (!record || record.status !== where.status) return { count: 0 };
        if (record.expiresAt > where.expiresAt.lte) return { count: 0 };
        Object.assign(record, data);
        return { count: 1 };
      },
      update: async ({ where, data }) => {
        const record = state.idempotencyRecords.get(where.key);
        Object.assign(record, data);
        return { ...record };
      },
    },
    $transaction: async (callback) => callback(tx),
  };

  return prisma;
}

function register(prisma, overrides = {}, options = {}) {
  return registerCustomer(prisma, { ...BASE_INPUT, ...overrides }, {
    now: new Date('2026-01-01T00:00:00Z'),
    passwordHash: 'test-password-hash',
    ...options,
  });
}

function addPendingRecord(state, { key, requestHash, expiresAt }) {
  state.idempotencyRecords.set(key, {
    key,
    requestHash,
    status: 'pending',
    responseStatus: null,
    responseJson: null,
    userId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    completedAt: null,
    expiresAt,
  });
}

test('registration request hashes are stable and payload-sensitive', () => {
  const payload = { name: BASE_INPUT.name, email: BASE_INPUT.email, password: BASE_INPUT.password };
  assert.equal(
    hashRegistrationRequest(payload),
    hashRegistrationRequest({ ...payload }),
  );
  assert.notEqual(
    hashRegistrationRequest(payload),
    hashRegistrationRequest({ ...payload, password: 'Password2@' }),
  );
});

test('retries with the same key and payload replay the original response', async () => {
  const state = createState();
  const prisma = createPrisma(state);

  const first = await register(prisma);
  const second = await register(prisma);

  assert.equal(first.status, 201);
  assert.deepEqual(second, first);
  assert.equal(state.users.length, 1);
  assert.equal(state.jobs.length, 1);
  assert.equal(state.idempotencyRecords.get(BASE_INPUT.idempotencyKey).status, 'completed');
});

test('the same key cannot be reused with a different payload', async () => {
  const state = createState();
  const prisma = createPrisma(state);

  await register(prisma);
  const reused = await register(prisma, { name: 'Bola Adeyemi' });

  assert.equal(reused.status, 409);
  assert.equal(reused.body.error, 'idempotency key already used with a different request');
  assert.equal(state.users.length, 1);
});

test('an active pending registration key returns a retryable conflict', async () => {
  const state = createState();
  const prisma = createPrisma(state);
  addPendingRecord(state, {
    key: BASE_INPUT.idempotencyKey,
    requestHash: hashRegistrationRequest(BASE_INPUT),
    expiresAt: new Date('2026-01-01T00:10:00Z'),
  });

  const result = await register(prisma);

  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'registration already in progress');
  assert.equal(result.body.retryable, true);
  assert.equal(state.users.length, 0);
});

test('an expired pending registration key can be taken over', async () => {
  const state = createState();
  const prisma = createPrisma(state);
  addPendingRecord(state, {
    key: BASE_INPUT.idempotencyKey,
    requestHash: hashRegistrationRequest(BASE_INPUT),
    expiresAt: new Date('2025-12-31T23:00:00Z'),
  });

  const result = await register(prisma);

  assert.equal(result.status, 201);
  assert.equal(state.users.length, 1);
  assert.equal(state.idempotencyRecords.get(BASE_INPUT.idempotencyKey).status, 'completed');
});

test('different keys for the same email create only one user and one active email job', async () => {
  const state = createState();
  const prisma = createPrisma(state);

  const first = await register(prisma);
  const second = await register(prisma, {
    idempotencyKey: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(second.body.user.id, first.body.user.id);
  assert.equal(state.users.length, 1);
  assert.equal(state.jobs.length, 1);
});
