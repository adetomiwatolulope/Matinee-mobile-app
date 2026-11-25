const assert = require('node:assert/strict');
const test = require('node:test');
const { createTmdbAdapter } = require('../tmdbAdapter');

function adapterConfig(overrides = {}) {
  return {
    enabled: true,
    apiKey: 'test-api-key',
    apiBaseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
    timeoutMs: 1000,
    maxRetries: 1,
    retryBaseMs: 1,
    retryMaxMs: 1,
    nowPlayingTtlSeconds: 86400,
    movieDetailsTtlSeconds: 604800,
    searchTtlSeconds: 3600,
    staleMaxAgeSeconds: 604800,
    ...overrides,
  };
}

function response(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: (name) => headers[name] || null },
  };
}

test('maps only normalized TMDB movie fields into app types', async () => {
  const raw = {
    id: 123,
    title: 'Lagos Nights',
    overview: 'A film.',
    release_date: '2026-01-02',
    poster_path: '/poster.jpg',
    backdrop_path: null,
    vote_average: 7.5,
    vote_count: 42,
    genre_ids: [18, 53],
    adult: false,
    original_language: 'en',
    internal_tmdb_field: 'ignored',
  };
  const fetchImpl = async () => response(raw);
  const adapter = createTmdbAdapter({ config: adapterConfig(), fetchImpl });

  const movie = await adapter.fetchMovieDetails(123);

  assert.equal(movie.tmdbId, 123);
  assert.equal(movie.title, 'Lagos Nights');
  assert.equal(movie.posterUrl, 'https://image.tmdb.org/t/p/w500/poster.jpg');
  assert.equal(movie.backdropUrl, null);
  assert.deepEqual(movie.genreIds, [18, 53]);
  assert.equal(movie.internal_tmdb_field, undefined);
});

test('retries a TMDB 429 and succeeds', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return response({ status_code: 25, status_message: 'rate limited' }, 429, { 'retry-after': '0' });
    }
    return response({ page: 1, results: [], total_pages: 1, total_results: 0 });
  };
  const adapter = createTmdbAdapter({ config: adapterConfig(), fetchImpl });

  const result = await adapter.fetchNowPlaying({ page: 1 });

  assert.equal(calls, 2);
  assert.deepEqual(result.results, []);
});

test('does not retry a fatal TMDB authentication error', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ status_code: 7, status_message: 'invalid key' }, 401);
  };
  const adapter = createTmdbAdapter({ config: adapterConfig(), fetchImpl });

  await assert.rejects(() => adapter.fetchNowPlaying({ page: 1 }));
  assert.equal(calls, 1);
});

test('returns the required TMDB attribution notice', () => {
  const adapter = createTmdbAdapter({ config: adapterConfig(), fetchImpl: async () => response({}) });
  const attribution = adapter.attribution();
  assert.equal(attribution.notice, 'This product uses the TMDB API but is not endorsed or certified by TMDB.');
  assert.equal(attribution.link, 'https://www.themoviedb.org');
});
