const crypto = require('crypto');
const { getTmdbConfig } = require('./config');

class TmdbAdapterError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'TmdbAdapterError';
    this.status = details.status || null;
    this.code = details.code || null;
    this.retryable = !!details.retryable;
    this.retryAfterMs = details.retryAfterMs || null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

function retryableTmdbCode(code) {
  return [9, 24, 43, 46].includes(code);
}

function fatalTmdbCode(code) {
  return [3, 7, 8, 10, 14, 16, 17, 30, 31, 32, 33, 35, 36, 37, 38, 39].includes(code);
}

function imageUrl(imageBaseUrl, path, size) {
  if (typeof path !== 'string' || path.length === 0) return null;
  return `${imageBaseUrl.replace(/\/$/, '')}/${size}${path}`;
}

function mapMovieSummary(raw, config) {
  return {
    tmdbId: typeof raw.id === 'number' ? raw.id : null,
    title: typeof raw.title === 'string' ? raw.title : 'Untitled',
    overview: typeof raw.overview === 'string' ? raw.overview : '',
    releaseDate: typeof raw.release_date === 'string' ? raw.release_date : null,
    posterUrl: imageUrl(config.imageBaseUrl, raw.poster_path, 'w500'),
    backdropUrl: imageUrl(config.imageBaseUrl, raw.backdrop_path, 'w780'),
    voteAverage: typeof raw.vote_average === 'number' ? raw.vote_average : null,
    voteCount: typeof raw.vote_count === 'number' ? raw.vote_count : null,
    genreIds: Array.isArray(raw.genre_ids) ? raw.genre_ids.filter((id) => Number.isInteger(id)) : [],
    adult: raw.adult === true,
    originalLanguage: typeof raw.original_language === 'string' ? raw.original_language : null,
  };
}

function mapGenres(raw, config) {
  if (!Array.isArray(raw.genres)) return [];
  return raw.genres
    .map((genre) => ({
      id: typeof genre.id === 'number' ? genre.id : null,
      name: typeof genre.name === 'string' ? genre.name : '',
    }))
    .filter((genre) => genre.id !== null);
}

function mapMovieDetails(raw, config) {
  return {
    ...mapMovieSummary(raw, config),
    tagline: typeof raw.tagline === 'string' ? raw.tagline : '',
    runtime: typeof raw.runtime === 'number' ? raw.runtime : null,
    genres: mapGenres(raw, config),
    homepage: typeof raw.homepage === 'string' && raw.homepage.startsWith('https://') ? raw.homepage : null,
    status: typeof raw.status === 'string' ? raw.status : null,
  };
}

function mapPaged(raw, mapper, config) {
  return {
    page: Number.isInteger(raw.page) ? raw.page : 1,
    results: Array.isArray(raw.results) ? raw.results.map((item) => mapper(item, config)).filter((item) => item.tmdbId !== null) : [],
    totalPages: Number.isInteger(raw.total_pages) ? raw.total_pages : 0,
    totalResults: Number.isInteger(raw.total_results) ? raw.total_results : 0,
  };
}

function createTmdbAdapter(options = {}) {
  const config = options.config || getTmdbConfig();
  const fetchImpl = options.fetchImpl || global.fetch;
  if (!config.enabled) throw new Error('TMDB integration is disabled');

  async function request(path, params = {}) {
    const base = `${config.apiBaseUrl.replace(/\/$/, '')}/`;
    const url = new URL(path.replace(/^\//, ''), base);
    url.searchParams.set('api_key', config.apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (error) {
      throw new TmdbAdapterError('TMDB request could not be completed', {
        retryable: true,
        status: 0,
      });
    } finally {
      clearTimeout(timeout);
    }

    let body = null;
    try {
      body = await response.json();
    } catch (_error) {
      body = null;
    }

    const tmdbCode = body && typeof body.status_code === 'number' ? body.status_code : null;
    if (tmdbCode !== null && tmdbCode !== 1) {
      throw new TmdbAdapterError('TMDB rejected the request', {
        status: response.status,
        code: tmdbCode,
        retryable: response.status === 429 || retryableTmdbCode(tmdbCode),
        retryAfterMs: parseRetryAfter(response.headers && response.headers.get ? response.headers.get('retry-after') : null),
      });
    }
    if (!response.ok) {
      throw new TmdbAdapterError('TMDB request failed', {
        status: response.status,
        code: tmdbCode,
        retryable: response.status === 429 || response.status >= 500,
        retryAfterMs: parseRetryAfter(response.headers && response.headers.get ? response.headers.get('retry-after') : null),
      });
    }
    if (fatalTmdbCode(tmdbCode)) {
      throw new TmdbAdapterError('TMDB rejected the request', { status: response.status, code: tmdbCode });
    }
    if (!body || typeof body !== 'object') {
      throw new TmdbAdapterError('TMDB returned an invalid response', { status: response.status, retryable: true });
    }
    return body;
  }

  async function withRetry(operation) {
    let lastError;
    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const retryable = error instanceof TmdbAdapterError && error.retryable;
        if (!retryable || attempt === config.maxRetries) throw error;
        const exponential = Math.min(config.retryMaxMs, config.retryBaseMs * (2 ** attempt));
        const jitter = crypto.randomInt(0, Math.max(1, Math.floor(config.retryBaseMs / 2)));
        const delay = error.retryAfterMs === null ? exponential + jitter : error.retryAfterMs;
        await sleep(delay);
      }
    }
    throw lastError;
  }

  return {
    attribution: () => ({
      notice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
      link: 'https://www.themoviedb.org',
      name: 'TMDB',
    }),
    fetchNowPlaying: async ({ page = 1 } = {}) => {
      const raw = await withRetry(() => request('/movie/now_playing', { page }));
      return mapPaged(raw, mapMovieSummary, config);
    },
    fetchMovieDetails: async (tmdbId) => {
      const raw = await withRetry(() => request(`/movie/${encodeURIComponent(tmdbId)}`));
      return mapMovieDetails(raw, config);
    },
    searchMovies: async ({ query, page = 1 }) => {
      const raw = await withRetry(() => request('/search/movie', { query, page }));
      return mapPaged(raw, mapMovieSummary, config);
    },
  };
}

module.exports = { TmdbAdapterError, createTmdbAdapter, mapMovieDetails, mapMovieSummary, mapPaged };
