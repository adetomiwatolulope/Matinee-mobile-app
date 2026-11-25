import Constants from 'expo-constants';

const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_PORT = 3001;

function normalizeConfiguredBase(value) {
  if (!value || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().replace(/\/$/, '');
  } catch (_error) {
    return null;
  }
}

function normalizeHost(value) {
  if (!value) return null;
  const cleaned = String(value).trim().replace(/^https?:\/\//, '').split('@').pop();
  if (!cleaned) return null;
  if (cleaned.startsWith('[')) {
    const end = cleaned.indexOf(']');
    return end === -1 ? null : cleaned.slice(0, end + 1);
  }
  const host = cleaned.split(':')[0];
  if (!host || /[\s/]/.test(host)) return null;
  if (host.includes('.')) {
    const parts = host.split('.');
    if (parts.every((part) => /^\d+$/.test(part))) {
      if (parts.length !== 4 || parts.some((part) => Number(part) > 255)) return null;
    }
  }
  return host;
}

function hostFromUri(hostUri) {
  if (!hostUri) return null;
  const cleaned = String(hostUri).trim().replace(/^https?:\/\//, '').split('@').pop();
  if (!cleaned) return null;
  if (cleaned.startsWith('[')) {
    const end = cleaned.indexOf(']');
    return end === -1 ? null : cleaned.slice(0, end + 1);
  }
  return normalizeHost(cleaned.split(':')[0]);
}

function resolveApiBase() {
  const configured = normalizeConfiguredBase(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (configured) return configured;

  const expoHost = Constants.expoConfig?.hostUri
    || Constants.manifest?.hostUri
    || Constants.manifest2?.extra?.expoClient?.hostUri;
  const host = hostFromUri(expoHost);
  if (host) return `http://${host}:${DEFAULT_PORT}`;

  return `http://10.0.2.2:${DEFAULT_PORT}`;
}

const API_BASE = resolveApiBase();

export async function api(path, { token, headers, ...options } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      signal: controller.signal,
      ...options,
    });
  } catch (error) {
    const message = String(error?.message || '');
    const canceled = error?.name === 'AbortError'
      || error?.cause?.name === 'AbortError'
      || /abort|cancel/i.test(message);
    if (canceled) {
      throw new Error(`Cannot reach the Matinee server at ${API_BASE}. Check that the backend is running on port ${DEFAULT_PORT} and your device is on the same network.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}
