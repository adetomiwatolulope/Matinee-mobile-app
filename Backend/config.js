require('dotenv').config();

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.startsWith('replace-')) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getNumberEnv(name, fallback, min = 1) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be an integer greater than or equal to ${min}`);
  }
  return value;
}

function getBooleanEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new Error(`${name} must be true or false`);
}

function getTokenSecret() {
  return getRequiredEnv('TOKEN_SECRET');
}

function getVerificationCodeSecret() {
  return getRequiredEnv('VERIFICATION_CODE_SECRET');
}

function getVerificationConfig() {
  return {
    ttlMinutes: getNumberEnv('VERIFICATION_CODE_TTL_MINUTES', 10),
    maxAttempts: getNumberEnv('VERIFICATION_MAX_ATTEMPTS', 6),
  };
}

function getEmailJobConfig() {
  return {
    pollMs: getNumberEnv('EMAIL_JOB_POLL_MS', 5000),
    leaseMs: getNumberEnv('EMAIL_JOB_LEASE_MS', 60000),
    maxAttempts: getNumberEnv('EMAIL_JOB_MAX_ATTEMPTS', 5),
    batchSize: getNumberEnv('EMAIL_JOB_BATCH_SIZE', 10),
  };
}

function getTmdbConfig() {
  const enabled = getBooleanEnv('TMDB_ENABLED', false);
  if (!enabled) return { enabled: false };

  const commercialUseApproved = getBooleanEnv('TMDB_COMMERCIAL_USE_APPROVED', false);
  const localTestingOnly = getBooleanEnv('TMDB_LOCAL_TESTING_ONLY', false);
  if (!commercialUseApproved && !localTestingOnly) {
    throw new Error('TMDB_COMMERCIAL_USE_APPROVED must be true before the TMDB integration can be enabled');
  }

  return {
    enabled: true,
    commercialUseApproved,
    localTestingOnly,
    apiKey: getRequiredEnv('TMDB_API_KEY'),
    apiBaseUrl: process.env.TMDB_API_BASE_URL || 'https://api.themoviedb.org/3',
    imageBaseUrl: process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p',
    timeoutMs: getNumberEnv('TMDB_REQUEST_TIMEOUT_MS', 5000),
    maxRetries: getNumberEnv('TMDB_MAX_RETRIES', 3, 0),
    retryBaseMs: getNumberEnv('TMDB_RETRY_BASE_MS', 250),
    retryMaxMs: getNumberEnv('TMDB_RETRY_MAX_MS', 2000),
    nowPlayingTtlSeconds: getNumberEnv('TMDB_NOW_PLAYING_TTL_SECONDS', 86400),
    movieDetailsTtlSeconds: getNumberEnv('TMDB_MOVIE_DETAILS_TTL_SECONDS', 604800),
    searchTtlSeconds: getNumberEnv('TMDB_SEARCH_TTL_SECONDS', 3600),
    staleMaxAgeSeconds: getNumberEnv('TMDB_STALE_MAX_AGE_SECONDS', 604800),
  };
}

function getRedisConfig() {
  return {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  };
}

function getMovieRateLimitConfig() {
  return {
    maxRequests: getNumberEnv('MOVIE_API_RATE_LIMIT_MAX', 60),
    windowSeconds: getNumberEnv('MOVIE_API_RATE_LIMIT_WINDOW_SECONDS', 60),
  };
}

function useLocalMovieStore() {
  return getBooleanEnv('MOVIE_LOCAL_MEMORY_STORE', false);
}

function assertStartupConfig() {
  getTokenSecret();
  getVerificationCodeSecret();
  getVerificationConfig();
  getEmailJobConfig();
  getTmdbConfig();
  getRedisConfig();
  getMovieRateLimitConfig();
  useLocalMovieStore();
}

module.exports = {
  assertStartupConfig,
  getBooleanEnv,
  getEmailJobConfig,
  getMovieRateLimitConfig,
  getNumberEnv,
  getRedisConfig,
  getRequiredEnv,
  getTokenSecret,
  getTmdbConfig,
  getVerificationCodeSecret,
  getVerificationConfig,
  useLocalMovieStore,
};
