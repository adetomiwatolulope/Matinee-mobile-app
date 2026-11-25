const crypto = require('crypto');
const { getEmailJobConfig, getVerificationConfig } = require('./config');
const defaultMailer = require('./mailer');
const { generateVerificationCode, storeVerificationCode } = require('./verificationService');

const VERIFICATION_JOB_TYPE = 'send_verification_email';
const ACTIVE_JOB_STATUSES = ['pending', 'processing'];
let activeWorkerId = null;

async function enqueueVerificationEmailJob(prisma, userId, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const pendingData = {
    status: 'pending',
    reference: userId,
    payload: { userId },
    runAt: now,
    attempts: 0,
    lastError: null,
    leaseOwner: null,
    leaseExpiresAt: null,
  };

  const existing = await prisma.emailJob.findFirst({
    where: { type: VERIFICATION_JOB_TYPE, reference: userId, status: { in: ACTIVE_JOB_STATUSES } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    return prisma.emailJob.update({ where: { id: existing.id }, data: pendingData });
  }

  try {
    return await prisma.emailJob.create({
      data: { type: VERIFICATION_JOB_TYPE, ...pendingData },
    });
  } catch (error) {
    if (error && error.code === 'P2002') {
      const winner = await prisma.emailJob.findFirst({
        where: { type: VERIFICATION_JOB_TYPE, reference: userId, status: { in: ACTIVE_JOB_STATUSES } },
        orderBy: { createdAt: 'desc' },
      });
      if (winner) {
        return prisma.emailJob.update({ where: { id: winner.id }, data: pendingData });
      }
    }
    throw error;
  }
}

async function claimDueJobs(prisma, { now, workerId, limit }) {
  const jobs = await prisma.emailJob.findMany({
    where: {
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
        leaseExpiresAt: new Date(now.getTime() + getEmailJobConfig().leaseMs),
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

  const terminal = fresh.attempts >= fresh.maxAttempts;
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

async function processEmailJob(prisma, job, options) {
  const { now, workerId, mailer, codeGenerator } = options;
  if (!(await ownsClaim(prisma, job, workerId, now))) return 'skipped';

  try {
    if (job.type !== VERIFICATION_JOB_TYPE) {
      throw new Error(`Unsupported email job type: ${job.type}`);
    }

    const userId = job.reference || (job.payload && job.payload.userId);
    if (!userId) throw new Error('Verification job has no user reference');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Verification user not found');
    if (user.emailVerified) {
      await completeJob(prisma, job, workerId);
      return 'completed';
    }
    if (!(await ownsClaim(prisma, job, workerId, new Date()))) return 'skipped';

    const { ttlMinutes } = getVerificationConfig();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const code = await storeVerificationCode(prisma, userId, job.id, expiresAt, codeGenerator);
    await mailer.sendVerificationEmail({ to: user.email, name: user.name, code });
    await completeJob(prisma, job, workerId);
    return 'sent';
  } catch (error) {
    await failJob(prisma, job, workerId, error);
    return 'failed';
  }
}

async function processPendingEmailJobs(prisma, options = {}) {
  const config = getEmailJobConfig();
  const now = options.now ? new Date(options.now) : new Date();
  const workerId = options.workerId || crypto.randomUUID();
  const jobs = await claimDueJobs(prisma, { now, workerId, limit: config.batchSize });
  const mailer = options.mailer || defaultMailer;
  const codeGenerator = options.codeGenerator || generateVerificationCode;
  const results = [];

  for (const job of jobs) {
    results.push(await processEmailJob(prisma, job, { now, workerId, mailer, codeGenerator }));
  }
  return results;
}

function startEmailJobWorker(prisma) {
  const workerId = crypto.randomUUID();
  activeWorkerId = workerId;
  const { pollMs } = getEmailJobConfig();
  const tick = async () => {
    try {
      await processPendingEmailJobs(prisma, { workerId });
    } catch (error) {
      console.error('Email worker tick error', error && error.message ? error.message : error);
    }
  };
  tick();
  return setInterval(tick, pollMs);
}

function kickEmailWorker(prisma) {
  if (!activeWorkerId) return Promise.resolve();
  return processPendingEmailJobs(prisma, { workerId: activeWorkerId }).catch((error) => {
    console.error('Email worker kick error', error && error.message ? error.message : error);
  });
}

module.exports = {
  enqueueVerificationEmailJob,
  processPendingEmailJobs,
  startEmailJobWorker,
  kickEmailWorker,
};
