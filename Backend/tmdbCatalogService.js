const { getTmdbConfig, useLocalMovieStore } = require('./config');
const redisCache = require('./redisClient');
const localMovieStore = require('./localMovieStore');
const { createTmdbAdapter } = require('./tmdbAdapter');

const CACHE_PREFIX = 'matinee:tmdb';

function cacheKey(kind, params) {
  return `${CACHE_PREFIX}:${kind}:${Object.values(params).map((value) => encodeURIComponent(String(value))).join(':')}`;
}

function cachedEntry(value) {
  if (!value || typeof value !== 'object' || !Number.isFinite(value.cachedAt)) return null;
  return value;
}

async function readThroughCache({ key, ttlSeconds, fetcher, cache, staleMaxAgeSeconds, now = Date.now() }) {
  let cached = null;
  try {
    cached = cachedEntry(await cache.getJson(key));
  } catch (_error) {
    cached = null;
  }
  const ageMs = cached ? Math.max(0, now - cached.cachedAt) : null;
  if (cached && ageMs <= ttlSeconds * 1000) {
    return {
      data: cached.data,
      meta: { source: 'cache', stale: false, ageSeconds: Math.floor(ageMs / 1000) },
    };
  }

  try {
    const data = await fetcher();
    try {
      await cache.setJson(key, { cachedAt: now, data }, Math.max(ttlSeconds, staleMaxAgeSeconds));
    } catch (_error) {
      console.error('TMDB cache write failed');
    }
    return { data, meta: { source: 'network', stale: false, ageSeconds: 0 } };
  } catch (error) {
    if (cached && ageMs <= staleMaxAgeSeconds * 1000) {
      return {
        data: cached.data,
        meta: { source: 'stale', stale: true, ageSeconds: Math.floor(ageMs / 1000) },
      };
    }
    throw error;
  }
}

function createTmdbCatalogService(options = {}) {
  const config = options.config || getTmdbConfig();
  const adapter = options.adapter || createTmdbAdapter({ config });
  const cache = options.cache || (useLocalMovieStore() ? localMovieStore : redisCache);

  return {
    async getNowPlaying({ page = 1 } = {}, now) {
      return readThroughCache({
        key: cacheKey('now-playing', { page }),
        ttlSeconds: config.nowPlayingTtlSeconds,
        staleMaxAgeSeconds: config.staleMaxAgeSeconds,
        fetcher: () => adapter.fetchNowPlaying({ page }),
        cache,
        now,
      });
    },
    async getMovieDetails(tmdbId, now) {
      return readThroughCache({
        key: cacheKey('movie-details', { tmdbId }),
        ttlSeconds: config.movieDetailsTtlSeconds,
        staleMaxAgeSeconds: config.staleMaxAgeSeconds,
        fetcher: () => adapter.fetchMovieDetails(tmdbId),
        cache,
        now,
      });
    },
    async searchMovies({ query, page = 1 }, now) {
      const normalizedQuery = query.trim().toLowerCase();
      return readThroughCache({
        key: cacheKey('search', { normalizedQuery, page }),
        ttlSeconds: config.searchTtlSeconds,
        staleMaxAgeSeconds: config.staleMaxAgeSeconds,
        fetcher: () => adapter.searchMovies({ query: normalizedQuery, page }),
        cache,
        now,
      });
    },
    attribution: () => adapter.attribution(),
  };
}

module.exports = { CACHE_PREFIX, cacheKey, createTmdbCatalogService, readThroughCache };
