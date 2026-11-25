const assert = require('node:assert/strict');
const test = require('node:test');
const localMovieStore = require('../localMovieStore');

test('local movie store stores and expires JSON values', async () => {
  localMovieStore.clear();
  await localMovieStore.setJson('test:key', { page: 1 }, 0.05);
  assert.deepEqual(await localMovieStore.getJson('test:key'), { page: 1 });
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(await localMovieStore.getJson('test:key'), null);
});

test('local movie store increments within a window and resets after expiry', async () => {
  localMovieStore.clear();
  assert.equal(await localMovieStore.incrementWithExpiry('test:limit', 0.05), 1);
  assert.equal(await localMovieStore.incrementWithExpiry('test:limit', 0.05), 2);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(await localMovieStore.incrementWithExpiry('test:limit', 0.05), 1);
});
