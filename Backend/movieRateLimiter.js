const { getMovieRateLimitConfig, useLocalMovieStore } = require('./config');
const redisCache = require('./redisClient');
const localMovieStore = require('./localMovieStore');

function createMovieRateLimiter(options = {}) {
  const cache = options.cache || (useLocalMovieStore() ? localMovieStore : redisCache);
  const config = options.config || getMovieRateLimitConfig();

  return async function movieRateLimiter(req, res, next) {
    const keys = [`matinee:ratelimit:movies:ip:${req.ip || 'unknown'}`];
    if (req.user && req.user.sub) keys.push(`matinee:ratelimit:movies:user:${req.user.sub}`);

    try {
      for (const key of keys) {
        const current = await cache.incrementWithExpiry(key, config.windowSeconds);
        if (current > config.maxRequests) {
          res.set('Retry-After', String(config.windowSeconds));
          return res.status(429).json({ error: 'Too many movie catalog requests' });
        }
      }
      return next();
    } catch (_error) {
      console.error('Movie rate limit store unavailable');
      return res.status(503).json({ error: 'Movie catalog temporarily unavailable' });
    }
  };
}

module.exports = { createMovieRateLimiter };
