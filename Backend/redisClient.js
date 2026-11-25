const Redis = require('ioredis');
const { getRedisConfig } = require('./config');

let client = null;
let connection = null;

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
  return client;
}

async function readyClient() {
  const redis = getClient();
  if (redis.status === 'ready') return redis;
  if (!connection) {
    connection = redis.connect().catch((error) => {
      connection = null;
      redis.disconnect();
      if (client === redis) client = null;
      throw error;
    });
  }
  await connection;
  return getClient();
}

async function getJson(key) {
  const redis = await readyClient();
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    await redis.del(key);
    return null;
  }
}

async function setJson(key, value, ttlSeconds) {
  const redis = await readyClient();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

async function incrementWithExpiry(key, windowSeconds) {
  const redis = await readyClient();
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSeconds);
  return current;
}

module.exports = { getClient, readyClient, getJson, incrementWithExpiry, setJson };
