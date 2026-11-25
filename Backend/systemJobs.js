const crypto = require('crypto');
const { getSystemJobConfig } = require('./config');
const { logger } = require('./logging');

const SYSTEM_JOB_TYPES = Object.freeze({
  PROVIDER_WEBHOOK: 'system.provider_webhook',
  HOLD_EXPIRY_SWEEP: 'system.hold_expiry_sweep',
  REFUND_PROCESSING: 'system.refund_processing',
});

const ACTIVE_JOB_STATUSES = ['pending', 'processing'];
let activeWorkerId = null;

class UnapprovedSystemJobHandlerError extends Error {}

function assertKnownType(type) {
  if (!Object.values(SYSTEM_JOB_TYPES).includes(type)) {
    throw new Error(`Unsupported system job type: ${type}`);
  }
}

function unapprovedHandler(type) {
  return async () => {
    throw new UnapprovedSystemJobHandlerError(`${type} handler is not approved`);
  };
}

function handlerFor(type, handlers) {
  if (handlers && typeof handlers[type] === 'function') return handlers[type];
  return unapprovedHandler(type);
}

async function enqueueSystemJob(prisma, { type, reference, payload = {}, runAt, correlationId }) {
  assertKnownType(type);
  if (!reference) throw new Error('System job reference is required');
  const now = runAt ? new Date(runAt) : new Date();
  const nextPayload = { ...payload, correlationId: correlationId || null };
  const pendingData = {
    status: 'pending',
    reference,
    payload: nextPayload,
    runAt: now,
    attempts: 0,
    lastError: null,
    leaseOwner: null,
    leaseExpiresAt: null,
  };

  const existing = await prisma.emailJob.findFirst({
    where: { type, reference, status: { in: ACTIVE_JOB_STATUSES } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return prisma.emailJob.update({ where: { id: existing.id }, data: pendingData });

  try {
    return await prisma.emailJob.create({ data: { type, ...pendingData } });
  } catch (error) {
    if (error && error.code === 'P2002') {
      const winner = await prisma.emailJob.findFirst({
        where: { type, reference, status: { in: ACTIVE_JOB_STATUSES } },
        orderBy: { createdAt: 'desc' },
      });
      if (winner) return prisma.emailJob.update({ where: { id: winner.id }, data: pendingData });
    }
    throw error;
  }
}

function enqueueProviderWebhookJob(prisma, { providerEventId, correlationId }) {
  return enqueueSystemJob(prisma, {
    type: SYSTEM_JOB_TYPES.PROVIDER_WEBHOOK,
    reference: providerEventId,
    payload: { providerEventId },
    correlationId,
  });
}

function enqueueHoldExpirySweepJob(prisma, { showtimeId, correlationId }) {
  return enqueueSystemJob(prisma, {
    type: SYSTEM_JOB_TYPES.HOLD_EXPIRY_SWEEP,
    reference: showtimeId || 'all-showtimes',
    payload: { showtimeId: showtimeId || null },
    correlationId,
  });
}

function enqueueRefundProcessingJob(prisma, { refundId, correlationId }) {
  return enqueueSystemJob(prisma, {
    type: SYSTEM_JOB_TYPES.REFUND_PROCESSING,
    reference: refundId,
    payload: { refundId },
    correlationId,
  });
}

async function claimDueJobs(prisma, { now, workerId, limit }) {
  const jobs = await prisma.emailJob.findMany({
    where: {
      type: { startsWith: 'system.' },
      OR: [
        { status: 'pending', runAt: { lte: now } },
        { status: 'processing', leaseExpiresAt: { lt: now } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const claimed = [];
  for (const job of jobs) {
    const where = job.status === 'processing'
      ? { id: job.id, status: 'processing', leaseExpiresAt: { lt: now } }
      : { id: job.id, status: 'pending', runAt: { lte: now } };
    const result = await prisma.emailJob.updateMany({
      where,
      data: {
        status: 'processing',
        leaseOwner: workerId,
        leaseExpiresAt: new Date(now.getTime() + getSystemJobConfig().leaseMs),
        attempts: { increment: 1 },
      },
    });
    if (result.count === 1) claimed.push(job);
  }
  return claimed;
}

async function ownsClaim(prisma, job, workerId, now) {
  const current = await prisma.emailJob.findFirst({
    where: {
      id: job.id,
      status: 'processing',
      leaseOwner: workerId,
      leaseExpiresAt: { gt: now },
    },
  });
  return !!current;
}

async function completeJob(prisma, job, workerId) {
  await prisma.emailJob.updateMany({
    where: { id: job.id, status: 'processing', leaseOwner: workerId },
    data: {
      status: 'completed',
      lastError: null,
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
}

async function failJob(prisma, job, workerId, error) {
  const fresh = await prisma.emailJob.findUnique({ where: { id: job.id } });
  if (!fresh || fresh.status !== 'processing' || fresh.leaseOwner !== workerId) return;

  const unapproved = error instanceof UnapprovedSystemJobHandlerError;
  const terminal = unapproved || fresh.attempts >= fresh.maxAttempts;
  const backoffMs = Math.min(60000, 1000 * (2 ** Math.min(Math.max(fresh.attempts - 1, 0), 6)));
  const jitterMs = crypto.randomInt(0, 1000);
  await prisma.emailJob.update({
    where: { id: fresh.id },
    data: {
      status: terminal ? 'manual_review' : 'pending',
      runAt: new Date(Date.now() + backoffMs + jitterMs),
      lastError: String(error && error.message ? error.message : error).slice(0, 500),
      leaseOwner: null,
      leaseExpiresAt: null,
    },
  });
}

async function processSystemJob(prisma, job, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const workerId = options.workerId;
  if (!(await ownsClaim(prisma, job, workerId, now))) return 'skipped';

  try {
    const handler = handlerFor(job.type, options.handlers);
    await handler({
      prisma,
      job,
      correlationId: job.payload && job.payload.correlationId ? job.payload.correlationId : null,
      logger,
    });
    await completeJob(prisma, job, workerId);
    return 'completed';
  } catch (error) {
    await failJob(prisma, job, workerId, error);
    return error instanceof UnapprovedSystemJobHandlerError ? 'manual_review' : 'failed';
  }
}

async function processDueSystemJobs(prisma, options = {}) {
  const config = getSystemJobConfig();
  const now = options.now ? new Date(options.now) : new Date();
  const workerId = options.workerId || crypto.randomUUID();
  const jobs = await claimDueJobs(prisma, { now, workerId, limit: config.batchSize });
  const results = [];

  for (const job of jobs) {
    results.push(await processSystemJob(prisma, job, { ...options, now, workerId }));
  }
  return results;
}

function startSystemJobWorker(prisma, options = {}) {
  const workerId = crypto.randomUUID();
  activeWorkerId = workerId;
  const { pollMs } = getSystemJobConfig();
  const tick = async () => {
    try {
      await processDueSystemJobs(prisma, { ...options, workerId });
    } catch (error) {
      logger.error('system_job_tick_error', {
        message: error && error.message ? error.message : error,
      });
    }
  };
  tick();
  return setInterval(tick, pollMs);
}

function kickSystemWorker(prisma) {
  if (!activeWorkerId) return Promise.resolve();
  return processDueSystemJobs(prisma, { workerId: activeWorkerId }).catch((error) => {
    logger.error('system_job_kick_error', {
      message: error && error.message ? error.message : error,
    });
  });
}

module.exports = {
  SYSTEM_JOB_TYPES,
  UnapprovedSystemJobHandlerError,
  enqueueHoldExpirySweepJob,
  enqueueProviderWebhookJob,
  enqueueRefundProcessingJob,
  enqueueSystemJob,
  kickSystemWorker,
  processDueSystemJobs,
  processSystemJob,
  startSystemJobWorker,
};
