const assert = require('node:assert/strict');
const test = require('node:test');
const { clientPrimaryReadHeader, markPrimaryRead } = require('../databaseRouting');

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

test('client primary-read headers include the pin and TTL', () => {
  assert.deepEqual(clientPrimaryReadHeader(30), {
    'x-matinee-read-consistency': 'primary',
    'x-matinee-primary-read-ttl-seconds': '30',
  });
});

test('markPrimaryRead sets primary-read response headers', () => {
  const res = fakeResponse();
  markPrimaryRead(res, 45);
  assert.equal(res.headers['x-matinee-read-consistency'], 'primary');
  assert.equal(res.headers['x-matinee-primary-read-ttl-seconds'], '45');
});
