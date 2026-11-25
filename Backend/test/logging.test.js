const assert = require('node:assert/strict');
const test = require('node:test');
const { logger, requestIdMiddleware } = require('../logging');

function fakeResponse() {
  const headers = {};
  return {
    headers,
    set(name, value) {
      headers[name] = value;
      return this;
    },
  };
}

test('request IDs are returned and attached to structured logs', () => {
  const original = console.log;
  const lines = [];
  console.log = (line) => lines.push(line);
  try {
    const req = { headers: { 'x-request-id': 'req-123' } };
    const res = fakeResponse();
    requestIdMiddleware(req, res, () => logger.info('test_event', { status: 200 }));
  } finally {
    console.log = original;
  }

  const entry = JSON.parse(lines[0]);
  assert.equal(entry.event, 'test_event');
  assert.equal(entry.requestId, 'req-123');
  assert.equal(entry.status, 200);
});

test('structured logs redact sensitive fields', () => {
  const original = console.error;
  const lines = [];
  console.error = (line) => lines.push(line);
  try {
    logger.error('safe_error', { password: 'secret-value', message: 'bad request' });
  } finally {
    console.error = original;
  }

  const serialized = lines.join('\n');
  assert.equal(serialized.includes('secret-value'), false);
  assert.equal(serialized.includes('bad request'), true);
});
