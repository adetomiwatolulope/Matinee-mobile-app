const BLOCKED_FIELDS = new Set(['authorization', 'password', 'token', 'code', 'secret']);
let installed = false;

function safeFields(fields) {
  const safe = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (!BLOCKED_FIELDS.has(key.toLowerCase()) && value !== undefined) safe[key] = value;
  }
  return safe;
}

export function reportAppError(event, fields = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    event,
    ...safeFields(fields),
  };
  console.error(`[matinee:error] ${JSON.stringify(payload)}`);
}

export function installAppErrorTracking() {
  if (installed) return;
  installed = true;
  const ErrorUtils = global.ErrorUtils;
  if (!ErrorUtils || typeof ErrorUtils.setGlobalHandler !== 'function') return;
  const previousHandler = typeof ErrorUtils.getGlobalHandler === 'function' ? ErrorUtils.getGlobalHandler() : null;

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportAppError('app_exception', {
      isFatal: !!isFatal,
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : null,
    });
    if (previousHandler) previousHandler(error, isFatal);
  });
}
