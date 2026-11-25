const assert = require('node:assert/strict');
const test = require('node:test');
const {
  SYSTEM_JOB_TYPES,
  enqueueProviderWebhookJob,
  processSystemJob,
} = require('../systemJobs');

function fakePrisma({ existing = null, current = null } = {}) {
  const updates = [];
  return {
    updates,
    emailJob: {
      findFirst: async () => current,
      findUnique: async () => current,
      findMany: async () => [],
      create: async (args) => args.data,
      update: async (args) => {
        updates.push(args.data);
        return args.data;
      },
      updateMany: async () => ({ count: 1 }),
    },
    existing,
  };
}

test('provider webhook jobs are durably enqueued with a correlation ID', async () => {
  const prisma = fakePrisma();
  const job = await enqueueProviderWebhookJob(prisma, {
    providerEventId: 'event-1',
    correlationId: 'corr-1',
  });

  assert.equal(job.type, SYSTEM_JOB_TYPES.PROVIDER_WEBHOOK);
  assert.equal(job.reference, 'event-1');
  assert.equal(job.payload.correlationId, 'corr-1');
});

test('unapproved system jobs move to manual review without side effects', async () => {
  const current = {
    id: 'job-1',
    type: SYSTEM_JOB_TYPES.REFUND_PROCESSING,
    payload: { correlationId: 'corr-2' },
    status: 'processing',
    leaseOwner: 'worker-1',
    attempts: 1,
    maxAttempts: 5,
  };
  const prisma = fakePrisma({ current });
  const result = await processSystemJob(prisma, current, { workerId: 'worker-1', now: new Date() });

  assert.equal(result, 'manual_review');
  assert.equal(prisma.updates[0].status, 'manual_review');
});
