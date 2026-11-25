const Redis = require('ioredis');
const { getRedisConfig } = require('./config');

let client = null;

function getClient() {
  if (!client) {
    const { url } = getRedisConfig();
    client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1000,
    });
    client.on('error', (error) => {
      console.error('Redis error', error && error.message ? error.message : error);
    });
  }
  if (client.status === 'wait') {
    client.connect().catch(() => {});
  }
  return client;
}

async function getJson(key) {
  const raw = await getClient().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    await getClient().del(key);
    return null;
  }
}

async function setJson(key, value, ttlSeconds) {
  await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

async function incrementWithExpiry(key, windowSeconds) {
  const redis = getClient();
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSeconds);
  return current;
}

module.exports = { getClient, getJson, incrementWithExpiry, setJson };
