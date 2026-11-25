const assert = require('node:assert/strict');
const test = require('node:test');
const { cacheKey, createTmdbCatalogService, readThroughCache } = require('../tmdbCatalogService');

function fakeCache() {
  const values = new Map();
  return {
    values,
    getJson: async (key) => values.get(key) || null,
    setJson: async (key, value, ttlSeconds) => {
      values.set(key, value);
      values.set(`${key}:ttl`, ttlSeconds);
    },
  };
}

function config(overrides = {}) {
  return {
    enabled: true,
    nowPlayingTtlSeconds: 3600,
    movieDetailsTtlSeconds: 604800,
    searchTtlSeconds: 3600,
    staleMaxAgeSeconds: 86400,
    ...overrides,
  };
}

function fakeAdapter(overrides = {}) {
  return {
    fetchNowPlaying: async () => ({ page: 1, results: ['network'] }),
    fetchMovieDetails: async () => ({ tmdbId: 1 }),
    searchMovies: async () => ({ page: 1, results: [] }),
    attribution: () => ({ notice: 'notice', link: 'link', name: 'TMDB' }),
    ...overrides,
  };
}

test('serves a fresh Redis cache hit without calling TMDB', async () => {
  const now = 1_000_000_000;
  const cache = fakeCache();
  const key = cacheKey('now-playing', { page: 1 });
  cache.values.set(key, { cachedAt: now - 10000, data: { page: 1, results: ['cached'] } });
  const adapter = fakeAdapter({
    fetchNowPlaying: async () => {
      throw new Error('TMDB should not be called');
    },
  });
  const service = createTmdbCatalogService({ adapter, cache, config: config() });

  const result = await service.getNowPlaying({ page: 1 }, now);

  assert.equal(result.meta.source, 'cache');
  assert.equal(result.meta.stale, false);
  assert.deepEqual(result.data.results, ['cached']);
});

test('serves bounded stale cache when TMDB fails', async () => {
  const now = 1_000_000_000;
  const cache = fakeCache();
  const cached = { cachedAt: now - 7200000, data: { page: 1, results: ['stale'] } };
  const adapter = fakeAdapter({
    fetchNowPlaying: async () => {
      throw new Error('TMDB offline');
    },
  });

  const result = await readThroughCache({
    key: 'test-key',
    ttlSeconds: 3600,
    staleMaxAgeSeconds: 86400,
    fetcher: adapter.fetchNowPlaying,
    cache: {
      getJson: async () => cached,
      setJson: async () => {},
    },
    now,
  });

  assert.equal(result.meta.source, 'stale');
  assert.equal(result.meta.stale, true);
  assert.deepEqual(result.data.results, ['stale']);
});

test('throws when cached data is older than the stale bound', async () => {
  const now = 1_000_000_000;
  const cache = {
    getJson: async () => ({ cachedAt: now - 90000000, data: { page: 1, results: [] } }),
    setJson: async () => {},
  };

  await assert.rejects(() => readThroughCache({
    key: 'test-key',
    ttlSeconds: 3600,
    staleMaxAgeSeconds: 86400,
    fetcher: async () => {
      throw new Error('TMDB offline');
    },
    cache,
    now,
  }));
});

test('stores fresh responses with the stale retention window', async () => {
  const now = 1_000_000_000;
  const cache = fakeCache();
  const service = createTmdbCatalogService({ adapter: fakeAdapter(), cache, config: config() });

  const result = await service.getNowPlaying({ page: 1 }, now);

  assert.equal(result.meta.source, 'network');
  const key = cacheKey('now-playing', { page: 1 });
  assert.equal(cache.values.get(`${key}:ttl`), 86400);
});
