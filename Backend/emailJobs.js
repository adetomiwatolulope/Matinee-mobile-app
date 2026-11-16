const crypto = require('crypto');
const { sendVerificationEmail } = require('./mailer');

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateSixDigitCode() {
  // Uses crypto.randomBytes(32) as requested to derive a 6-digit verification code
  const n = BigInt('0x' + crypto.randomBytes(32).toString('hex'));
  return (n % 1000000n).toString().padStart(6, '0');
}

async function enqueueVerificationEmailJob(prisma, userId) {
  return prisma.emailJob.create({
    data: {
      type: 'send_verification_email',
      status: 'pending',
      payload: { userId },
      runAt: new Date(),
    },
  });
}

async function processPendingEmailJobs(prisma) {
  const now = new Date();
  const jobs = await prisma.emailJob.findMany({
    where: { status: 'pending', runAt: { lte: now } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  for (const job of jobs) {
    const claimed = await prisma.emailJob.updateMany({
      where: { id: job.id, status: 'pending' },
      data: { status: 'processing', attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    try {
      if (job.type === 'send_verification_email') {
        const userId = job.payload && job.payload.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        if (user.emailVerified) {
          await prisma.emailJob.update({ where: { id: job.id }, data: { status: 'completed', lastError: null } });
          continue;
        }

        const code = generateSixDigitCode();
        const codeHash = hashCode(code);
        const ttlMinutes = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 10);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerificationCodeHash: codeHash,
            emailVerificationExpiresAt: expiresAt,
            emailVerificationAttempts: 0,
          },
        });

        await sendVerificationEmail({ to: user.email, name: user.name, code });
      }

      await prisma.emailJob.update({ where: { id: job.id }, data: { status: 'completed', lastError: null } });
    } catch (err) {
      const fresh = await prisma.emailJob.findUnique({ where: { id: job.id } });
      const attempts = fresh ? fresh.attempts : job.attempts + 1;
      const maxAttempts = fresh ? fresh.maxAttempts : job.maxAttempts;
      const failed = attempts >= maxAttempts;
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: failed ? 'failed' : 'pending',
          lastError: String(err && err.message ? err.message : err),
          runAt: failed ? new Date() : new Date(Date.now() + Math.min(60000, attempts * 5000)),
        },
      });
      console.error('Email job error', job.id, err);
    }
  }
}

function startEmailJobWorker(prisma) {
  const intervalMs = Number(process.env.EMAIL_JOB_POLL_MS || 5000);
  const tick = async () => {
    try {
      await processPendingEmailJobs(prisma);
    } catch (e) {
      console.error('Email worker tick error', e);
    }
  };
  tick();
  return setInterval(tick, intervalMs);
}

module.exports = { hashCode, generateSixDigitCode, enqueueVerificationEmailJob, startEmailJobWorker, processPendingEmailJobs };
