const crypto = require('crypto');
const { z } = require('zod');

const FLUTTERWAVE_V3_BASE_URL = 'https://api.flutterwave.com/v3';

const providerIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/),
]);

const chargeWebhookSchema = z.object({
  event: z.literal('charge.completed'),
  data: z.object({
    id: providerIdSchema,
    status: z.string().trim().min(1),
    tx_ref: z.string().trim().min(1),
    flw_ref: z.string().trim().min(1).optional(),
    amount: z.number().finite(),
    charged_amount: z.number().finite().optional(),
    currency: z.string().trim().min(1),
    created_at: z.string().trim().min(1).optional(),
  }).passthrough(),
}).passthrough();

const verificationSchema = z.object({
  id: providerIdSchema,
  tx_ref: z.string().trim().min(1),
  flw_ref: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1),
  amount: z.number().finite(),
  charged_amount: z.number().finite().optional(),
  amount_settled: z.number().finite().optional(),
  currency: z.string().trim().min(1),
  created_at: z.string().trim().min(1).optional(),
}).passthrough();

class FlutterwaveV3AdapterError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'FlutterwaveV3AdapterError';
    this.code = details.code || null;
    this.status = details.status || null;
    this.retryable = !!details.retryable;
  }
}

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new FlutterwaveV3AdapterError(`${name} is required`, { code: 'invalid_argument' });
  }
  return value.trim();
}

function verifyFlutterwaveV3WebhookSecretHeader({ headerValue, secretHash }) {
  if (typeof headerValue !== 'string' || typeof secretHash !== 'string') return false;
  if (headerValue.length === 0 || secretHash.length === 0) return false;

  const received = Buffer.from(headerValue);
  const expected = Buffer.from(secretHash);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

function normalizeFlutterwaveV3WebhookPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new FlutterwaveV3AdapterError('Flutterwave webhook payload must be an object', { code: 'invalid_event' });
  }

  const eventType = typeof payload.event === 'string' ? payload.event : null;
  if (eventType !== 'charge.completed') {
    return {
      kind: 'unsupported',
      provider: 'FLUTTERWAVE',
      apiVersion: 'v3',
      eventType,
    };
  }

  const parsed = chargeWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    throw new FlutterwaveV3AdapterError('Flutterwave webhook payload is invalid', { code: 'invalid_event' });
  }

  const event = parsed.data;
  const providerTransactionId = String(event.data.id);
  const eventSubType = typeof payload['event.type'] === 'string' ? payload['event.type'] : '';

  return {
    kind: 'charge.completed',
    provider: 'FLUTTERWAVE',
    apiVersion: 'v3',
    eventType: event.event,
    eventSubType,
    dedupeKey: `flw-v3:${event.event}:${eventSubType}:${providerTransactionId}:${event.data.status}`,
    providerTransactionId,
    providerFlwReference: event.data.flw_ref || null,
    paymentReference: event.data.tx_ref,
    providerStatus: event.data.status,
    providerAmount: event.data.amount,
    providerChargedAmount: event.data.charged_amount ?? null,
    currency: event.data.currency,
    occurredAt: event.data.created_at || null,
  };
}

function buildFlutterwaveV3VerifyTransactionRequest({ transactionId, secretKey, apiBaseUrl = FLUTTERWAVE_V3_BASE_URL }) {
  const transactionPart = requireNonEmptyString(String(transactionId), 'transactionId');
  const secret = requireNonEmptyString(secretKey, 'secretKey');
  const base = requireNonEmptyString(apiBaseUrl, 'apiBaseUrl').replace(/\/$/, '');

  return {
    url: `${base}/transactions/${encodeURIComponent(transactionPart)}/verify`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${secret}`,
    },
  };
}

function createFlutterwaveV3Adapter(options = {}) {
  const apiBaseUrl = options.apiBaseUrl || FLUTTERWAVE_V3_BASE_URL;
  const fetchImpl = options.fetchImpl || global.fetch;

  async function verifyTransaction({ transactionId, secretKey }) {
    const request = buildFlutterwaveV3VerifyTransactionRequest({ transactionId, secretKey, apiBaseUrl });
    let response;

    try {
      response = await fetchImpl(request.url, { method: request.method, headers: request.headers });
    } catch (_error) {
      throw new FlutterwaveV3AdapterError('Flutterwave verification request could not be completed', {
        code: 'network_error',
        retryable: true,
      });
    }

    let body;
    try {
      body = await response.json();
    } catch (_error) {
      throw new FlutterwaveV3AdapterError('Flutterwave verification response was not JSON', {
        code: 'invalid_response',
        status: response.status,
        retryable: response.status >= 500,
      });
    }

    if (!response.ok) {
      throw new FlutterwaveV3AdapterError('Flutterwave verification request failed', {
        code: 'provider_error',
        status: response.status,
        retryable: response.status === 429 || response.status >= 500,
      });
    }

    if (!body || body.status !== 'success' || !body.data || typeof body.data !== 'object') {
      throw new FlutterwaveV3AdapterError('Flutterwave verification response was rejected', {
        code: 'invalid_response',
        status: response.status,
      });
    }

    const parsed = verificationSchema.safeParse(body.data);
    if (!parsed.success) {
      throw new FlutterwaveV3AdapterError('Flutterwave verification response is invalid', {
        code: 'invalid_response',
        status: response.status,
      });
    }

    const transaction = parsed.data;
    return {
      provider: 'FLUTTERWAVE',
      apiVersion: 'v3',
      providerTransactionId: String(transaction.id),
      providerFlwReference: transaction.flw_ref || null,
      paymentReference: transaction.tx_ref,
      providerStatus: transaction.status,
      providerAmount: transaction.amount,
      providerChargedAmount: transaction.charged_amount ?? null,
      providerSettledAmount: transaction.amount_settled ?? null,
      currency: transaction.currency,
      occurredAt: transaction.created_at || null,
    };
  }

  return {
    verifyWebhookSecretHeader: verifyFlutterwaveV3WebhookSecretHeader,
    normalizeWebhookPayload: normalizeFlutterwaveV3WebhookPayload,
    buildVerifyTransactionRequest: (input) => buildFlutterwaveV3VerifyTransactionRequest({ ...input, apiBaseUrl }),
    verifyTransaction,
  };
}

module.exports = {
  FLUTTERWAVE_V3_BASE_URL,
  FlutterwaveV3AdapterError,
  buildFlutterwaveV3VerifyTransactionRequest,
  createFlutterwaveV3Adapter,
  normalizeFlutterwaveV3WebhookPayload,
  verifyFlutterwaveV3WebhookSecretHeader,
};
