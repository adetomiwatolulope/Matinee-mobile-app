const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { disconnectPrisma, prisma } = require('../prismaClient');
const { registerCustomer } = require('../registrationService');

const RUN_POSTGRES_TESTS = process.env.RUN_POSTGRES_TESTS === '1';
const postgresTest = RUN_POSTGRES_TESTS ? test : test.skip;

if (RUN_POSTGRES_TESTS) {
  after(async () => {
    await disconnectPrisma();
  });
}

async function cleanupRegistration(email, keys) {
  await prisma.registrationIdempotency.deleteMany({ where: { key: { in: keys } } });
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.emailJob.deleteMany({ where: { reference: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

function registrationInput(email, key) {
  return {
    idempotencyKey: key,
    name: 'Ada Okafor',
    email,
    password: 'Password1@',
  };
}

postgresTest('concurrent identical register requests create one user and one email job', async () => {
  const email = `idem-${randomUUID()}@example.com`;
  const key = randomUUID();
  try {
    const results = await Promise.all([
      registerCustomer(prisma, registrationInput(email, key)),
      registerCustomer(prisma, registrationInput(email, key)),
    ]);

    assert.ok(results.some((result) => result.status === 201));
    for (const result of results) {
      assert.ok(result.status === 201 || result.status === 409);
    }
    const successes = results.filter((result) => result.status === 201);
    if (successes.length === 2) assert.deepEqual(successes[0], successes[1]);

    const users = await prisma.user.findMany({ where: { email } });
    const user = await prisma.user.findUnique({ where: { email } });
    const jobs = await prisma.emailJob.findMany({
      where: { reference: user.id, type: 'send_verification_email' },
    });
    assert.equal(users.length, 1);
    assert.equal(jobs.length, 1);
  } finally {
    await cleanupRegistration(email, [key]);
  }
});

postgresTest('concurrent different keys for one email create one user', async () => {
  const email = `race-${randomUUID()}@example.com`;
  const firstKey = randomUUID();
  const secondKey = randomUUID();
  try {
    const results = await Promise.all([
      registerCustomer(prisma, registrationInput(email, firstKey)),
      registerCustomer(prisma, registrationInput(email, secondKey)),
    ]);

    assert.equal(results.length, 2);
    assert.ok(results.every((result) => result.status === 201));

    const users = await prisma.user.findMany({ where: { email } });
    const user = await prisma.user.findUnique({ where: { email } });
    const activeJobs = await prisma.emailJob.findMany({
      where: {
        reference: user.id,
        type: 'send_verification_email',
        status: { in: ['pending', 'processing'] },
      },
    });
    assert.equal(users.length, 1);
    assert.equal(results[0].body.user.id, results[1].body.user.id);
    assert.equal(activeJobs.length, 1);
  } finally {
    await cleanupRegistration(email, [firstKey, secondKey]);
  }
});
