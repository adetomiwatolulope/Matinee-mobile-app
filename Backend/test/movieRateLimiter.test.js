const assert = require('node:assert/strict');
const test = require('node:test');
const { createMovieRateLimiter } = require('../movieRateLimiter');

function fakeCounterCache() {
  const values = new Map();
  return {
    values,
    incrementWithExpiry: async (key, windowSeconds) => {
      const current = (values.get(key) || 0) + 1;
      values.set(key, current);
      values.set(`${key}:window`, windowSeconds);
      return current;
    },
  };
}

function fakeResponse() {
  const headers = {};
  const result = {
    headersSent: false,
    statusCode: 200,
    payload: null,
    set(name, value) {
      headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      this.headersSent = true;
      return this;
    },
    headers,
  };
  return result;
}

test('allows requests up to the shared limit', async () => {
  const cache = fakeCounterCache();
  const limiter = createMovieRateLimiter({ cache, config: { maxRequests: 2, windowSeconds: 60 } });
  const req = { user: { sub: 'user-1' }, ip: '127.0.0.1' };
  const first = fakeResponse();
  const second = fakeResponse();
  let nextCalls = 0;

  await limiter(req, first, () => { nextCalls += 1; });
  await limiter(req, second, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(first.headersSent, false);
  assert.equal(second.headersSent, false);
  assert.equal(cache.values.get('matinee:ratelimit:movies:user-1:window'), 60);
});

test('returns 429 above the shared limit', async () => {
  const cache = fakeCounterCache();
  const limiter = createMovieRateLimiter({ cache, config: { maxRequests: 1, windowSeconds: 60 } });
  const req = { user: { sub: 'user-2' }, ip: '127.0.0.1' };
  await limiter(req, fakeResponse(), () => {});

  const blocked = fakeResponse();
  let nextCalls = 0;
  await limiter(req, blocked, () => { nextCalls += 1; });

  assert.equal(nextCalls, 0);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['Retry-After'], '60');
});
