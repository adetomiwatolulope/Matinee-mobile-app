const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { assertStartupConfig, getDatabasePoolConfig, getTmdbConfig, getTokenSecret } = require('./config');
const { disconnectPrisma, isPrimaryReadRequested, prisma, readClientFor } = require('./prismaClient');
const { markPrimaryRead } = require('./databaseRouting');
const {
  installProcessErrorTracking,
  logger,
  requestErrorHandler,
  requestFinishLogger,
  requestIdMiddleware,
} = require('./logging');
const { startSystemJobWorker } = require('./systemJobs');
const { enqueueVerificationEmailJob, kickEmailWorker, startEmailJobWorker } = require('./emailJobs');
const { registerCustomer } = require('./registrationService');
const { clearVerificationState, verifyEmailCode } = require('./verificationService');
const { createTmdbCatalogService } = require('./tmdbCatalogService');
const { TmdbAdapterError } = require('./tmdbAdapter');
const { createMovieRateLimiter } = require('./movieRateLimiter');

const app = express();

installProcessErrorTracking();
app.use(requestIdMiddleware);
app.use(cors());
app.use(express.json());
app.use(requestFinishLogger);
app.use((req, _res, next) => {
  req.readConsistency = isPrimaryReadRequested(req) ? 'primary' : 'eventual';
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, getTokenSecret(), { expiresIn: '1h' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, getTokenSecret());
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const registerSchema = z.object({
  name: z.string({ required_error: 'name is required' }).trim().min(1, 'name is required').regex(/^[A-Za-z ]+$/, 'Name must use only letters'),
  email: z.string({ required_error: 'email is required' }).trim().toLowerCase().email('Enter a valid email address'),
  password: z.string({ required_error: 'password is required' })
    .min(10, 'password must be 10-64 characters')
    .max(64, 'password must be 10-64 characters')
    .regex(/[a-z]/, 'password must contain a lowercase letter')
    .regex(/[A-Z]/, 'password must contain an uppercase letter')
    .regex(/[0-9]/, 'password must contain a number')
    .regex(/[#@>^]/, 'password must contain a special character (#@>^)'),
});

const idempotencyKeySchema = z.string().uuid('Idempotency-Key must be a valid UUID');

const loginSchema = z.object({
  email: z.string({ required_error: 'email is required' }).trim().toLowerCase().email('Enter a valid email address'),
  password: z.string({ required_error: 'password is required' })
    .min(10, 'password must be 10-64 characters')
    .max(64, 'password must be 10-64 characters')
    .regex(/[a-z]/, 'password must contain a lowercase letter')
    .regex(/[A-Z]/, 'password must contain an uppercase letter')
    .regex(/[0-9]/, 'password must contain a number')
    .regex(/[#@>^]/, 'password must contain a special character (#@>^)'),
});

const emailSchema = z.object({
  email: z.string({ required_error: 'email is required' }).trim().toLowerCase().email('Enter a valid email address'),
});

const verifyCodeSchema = z.object({
  email: z.string({ required_error: 'email is required' }).trim().toLowerCase().email('Enter a valid email address'),
  code: z.string({ required_error: 'code is required' }).trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
});

function parseWith(schema, input, res) {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, response: res.status(400).json({ error: first ? first.message : 'Invalid request', details: result.error.issues }) };
  }
  return { ok: true, data: result.data };
}

function parseBody(schema, req, res) {
  return parseWith(schema, req.body, res);
}

const moviePageSchema = z.object({
  page: z.string().trim().regex(/^\d+$/, 'page must be a positive integer').transform(Number).refine((value) => value >= 1 && value <= 500, 'page must be between 1 and 500').optional(),
});

const movieSearchSchema = moviePageSchema.extend({
  q: z.string({ required_error: 'q is required' }).trim().min(1, 'q is required').max(100, 'q must be at most 100 characters'),
});

const movieIdSchema = z.object({
  id: z.string({ required_error: 'id is required' }).regex(/^\d+$/, 'id must be a TMDB numeric id'),
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

app.post('/auth/register', async (req, res) => {
  try {
    const idempotencyKey = idempotencyKeySchema.safeParse(req.headers['idempotency-key']);
    if (!idempotencyKey.success) {
      return res.status(400).json({ error: 'Idempotency-Key must be a valid UUID' });
    }

    const parsed = parseBody(registerSchema, req, res);
    if (!parsed.ok) return parsed.response;

    const result = await registerCustomer(prisma, {
      idempotencyKey: idempotencyKey.data,
      ...parsed.data,
    });
    if (result.status >= 200 && result.status < 300) {
      markPrimaryRead(res, getDatabasePoolConfig().primaryReadTtlSeconds);
      kickEmailWorker(prisma);
    }
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('registration_failed', { message: error && error.message ? error.message : error });
    return res.status(500).json({ error: 'internal error', requestId: req.requestId });
  }
});

app.post('/auth/verify-code', async (req, res) => {
  try {
    const parsed = parseBody(verifyCodeSchema, req, res);
    if (!parsed.ok) return parsed.response;

    const result = await verifyEmailCode(prisma, parsed.data);
    if (!result.ok) {
      if (result.reason === 'already_verified') {
        return res.status(409).json({ error: 'Email already verified. Please log in.' });
      }
      if (result.reason === 'expired') {
        return res.status(400).json({ error: 'Verification code expired. Request a new code.', requiresResend: true });
      }
      if (result.reason === 'locked') {
        return res.status(400).json({ error: 'Too many incorrect attempts. Request a new code.', requiresResend: true });
      }
      return res.status(400).json({
        error: 'Invalid or expired verification code',
        requiresResend: !!result.requiresResend,
        ...(result.remainingAttempts === undefined ? {} : { remainingAttempts: result.remainingAttempts }),
      });
    }

    markPrimaryRead(res, getDatabasePoolConfig().primaryReadTtlSeconds);
    return res.json({ token: signToken(result.user), user: result.user });
  } catch (error) {
    logger.error('verification_failed', { message: error && error.message ? error.message : error });
    return res.status(500).json({ error: 'internal error', requestId: req.requestId });
  }
});

app.post('/auth/resend-verification', async (req, res) => {
  try {
    const parsed = parseBody(emailSchema, req, res);
    if (!parsed.ok) return parsed.response;
    const { email } = parsed.data;

    const user = await readClientFor(req).user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      await prisma.$transaction(async (tx) => {
        await clearVerificationState(tx, user.id);
        await enqueueVerificationEmailJob(tx, user.id);
      });
      markPrimaryRead(res, getDatabasePoolConfig().primaryReadTtlSeconds);
      kickEmailWorker(prisma);
    }
    return res.json({ message: 'If the account is unverified, a new code will be sent to the email' });
  } catch (error) {
    logger.error('resend_verification_failed', { message: error && error.message ? error.message : error });
    return res.status(500).json({ error: 'internal error', requestId: req.requestId });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const parsed = parseBody(loginSchema, req, res);
    if (!parsed.ok) return parsed.response;
    const { email, password } = parsed.data;

    const user = await readClientFor(req).user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified', requiresVerification: true, email: user.email });
    }
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    logger.error('login_failed', { message: error && error.message ? error.message : error });
    return res.status(500).json({ error: 'internal error', requestId: req.requestId });
  }
});

app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await readClientFor(req).user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'not found' });
    if (!user.emailVerified) return res.status(403).json({ error: 'Email not verified', requiresVerification: true });
    return res.json({ user });
  } catch (error) {
    logger.error('session_lookup_failed', { message: error && error.message ? error.message : error });
    return res.status(500).json({ error: 'internal error', requestId: req.requestId });
  }
});

let movieCatalogService = null;
const movieRateLimiter = createMovieRateLimiter();

function catalogService() {
  if (!getTmdbConfig().enabled) return null;
  if (!movieCatalogService) movieCatalogService = createTmdbCatalogService();
  return movieCatalogService;
}

function applyMovieRateLimit(req, res) {
  return new Promise((resolve) => movieRateLimiter(req, res, resolve));
}

function sendMovieResult(res, service, result) {
  res.set('X-Matinee-Cache-Source', result.meta.source);
  res.set('X-Matinee-Cache-Age-Seconds', String(result.meta.ageSeconds));
  return res.json({ ...result.data, attribution: service.attribution(), meta: result.meta });
}

function handleMovieError(req, res, error) {
  if (error instanceof TmdbAdapterError && error.status === 429 && error.retryAfterMs !== null) {
    res.set('Retry-After', String(Math.max(1, Math.ceil(error.retryAfterMs / 1000))));
  }
  logger.error('movie_catalog_failed', { message: error && error.message ? error.message : error });
  return res.status(503).json({ error: 'Movie catalog temporarily unavailable', requestId: req.requestId });
}

async function handleMovieRequest(req, res, { schema, input, call }) {
  const parsed = parseWith(schema, input, res);
  if (!parsed.ok) return parsed.response;

  const service = catalogService();
  if (!service) return res.status(503).json({ error: 'Movie catalog is not enabled' });

  await applyMovieRateLimit(req, res);
  if (res.headersSent) return undefined;

  try {
    const result = await call(service, parsed.data);
    return sendMovieResult(res, service, result);
  } catch (error) {
    return handleMovieError(req, res, error);
  }
}

app.get('/movies/now-playing', authMiddleware, (req, res) => handleMovieRequest(req, res, {
  schema: moviePageSchema,
  input: req.query,
  call: (service, data) => service.getNowPlaying({ page: data.page ?? 1 }),
}));

app.get('/movies/search', authMiddleware, (req, res) => handleMovieRequest(req, res, {
  schema: movieSearchSchema,
  input: req.query,
  call: (service, data) => service.searchMovies({ query: data.q, page: data.page ?? 1 }),
}));

app.get('/movies/:id', authMiddleware, (req, res) => handleMovieRequest(req, res, {
  schema: movieIdSchema,
  input: req.params,
  call: (service, data) => service.getMovieDetails(data.id),
}));

app.use(requestErrorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';

assertStartupConfig();
startEmailJobWorker(prisma);
startSystemJobWorker(prisma);

const server = app.listen(port, host, () => {
  logger.info('server_started', { host, port });
});

async function shutdown() {
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
