const entries = new Map();

function isExpired(entry, now) {
  return entry.expiresAt !== null && entry.expiresAt <= now;
}

function removeIfExpired(key, now) {
  const entry = entries.get(key);
  if (entry && isExpired(entry, now)) {
    entries.delete(key);
    return null;
  }
  return entry || null;
}

async function getJson(key) {
  const entry = removeIfExpired(key, Date.now());
  return entry ? entry.value : null;
}

async function setJson(key, value, ttlSeconds) {
  const ttlMs = Math.max(Number(ttlSeconds) || 0, 0) * 1000;
  entries.set(key, {
    value: JSON.parse(JSON.stringify(value)),
    expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
  });
}

async function incrementWithExpiry(key, windowSeconds) {
  const now = Date.now();
  let entry = removeIfExpired(key, now);
  if (!entry) {
    entry = { value: 0, expiresAt: now + Math.max(Number(windowSeconds) || 0, 0) * 1000 };
    entries.set(key, entry);
  }
  entry.value += 1;
  if (entry.expiresAt !== null && entry.expiresAt <= now) {
    entry.expiresAt = now + Math.max(Number(windowSeconds) || 0, 0) * 1000;
  }
  return entry.value;
}

function clear() {
  entries.clear();
}

module.exports = { clear, getJson, incrementWithExpiry, setJson };
