const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');
const { REQUEST_ID_HEADER } = require('./databaseRouting');

const storage = new AsyncLocalStorage();
const REDACTED_FIELDS = new Set(['authorization', 'password', 'token', 'code', 'secret']);

function safeFields(fields) {
  const safe = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (!REDACTED_FIELDS.has(key.toLowerCase()) && value !== undefined) safe[key] = value;
  }
  return safe;
}

function currentRequestId() {
  return storage.getStore()?.requestId || null;
}

function writeLog(level, event, fields = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: currentRequestId() || fields.requestId || null,
    ...safeFields(fields),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else console.log(line);
}

const logger = {
  info: (event, fields) => writeLog('info', event, fields),
  warn: (event, fields) => writeLog('warn', event, fields),
  error: (event, fields) => writeLog('error', event, fields),
};

function requestIdMiddleware(req, res, next) {
  const incoming = String(req.headers?.[REQUEST_ID_HEADER] || '');
  const requestId = /^[A-Za-z0-9_-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  storage.run({ requestId }, next);
}

function requestFinishLogger(req, res, next) {
  res.on('finish', () => {
    logger.info('request_completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      readConsistency: req.readConsistency || 'eventual',
    });
  });
  next();
}

function requestErrorHandler(error, req, res, _next) {
  const requestId = req.requestId || currentRequestId();
  logger.error('request_failed', {
    message: error && error.message ? error.message : 'unknown error',
    requestId,
  });
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal error', requestId });
}

function installProcessErrorTracking() {
  process.on('uncaughtException', (error) => {
    logger.error('process_uncaught_exception', {
      message: error && error.message ? error.message : 'unknown error',
      stack: error && error.stack ? error.stack : null,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('process_unhandled_rejection', {
      message: reason && reason.message ? reason.message : String(reason),
    });
  });
}

module.exports = {
  REQUEST_ID_HEADER,
  currentRequestId,
  installProcessErrorTracking,
  logger,
  requestErrorHandler,
  requestFinishLogger,
  requestIdMiddleware,
};
