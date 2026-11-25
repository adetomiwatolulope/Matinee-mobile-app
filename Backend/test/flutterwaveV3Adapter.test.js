const assert = require('node:assert/strict');
const test = require('node:test');
const {
  FlutterwaveV3AdapterError,
  buildFlutterwaveV3VerifyTransactionRequest,
  createFlutterwaveV3Adapter,
  normalizeFlutterwaveV3WebhookPayload,
  verifyFlutterwaveV3WebhookSecretHeader,
} = require('../flutterwaveV3Adapter');

function chargeWebhook(overrides = {}) {
  return {
    event: 'charge.completed',
    'event.type': 'CARD_TRANSACTION',
    data: {
      id: 285959875,
      tx_ref: 'matinee-booking-123',
      flw_ref: 'PeterEkene/FLW270177170',
      amount: 15000,
      charged_amount: 15000,
      currency: 'NGN',
      status: 'successful',
      created_at: '2026-01-02T10:00:00.000Z',
      customer: { email: 'customer@example.com' },
      card: { last_4digits: '7889' },
      ...overrides,
    },
  };
}

function verificationResponse(overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: 'success',
      message: 'Transaction fetched successfully',
      data: {
        id: 285959875,
        tx_ref: 'matinee-booking-123',
        flw_ref: 'PeterEkene/FLW270177170',
        amount: 15000,
        charged_amount: 15000,
        amount_settled: 14900,
        currency: 'NGN',
        status: 'successful',
        created_at: '2026-01-02T10:00:00.000Z',
        customer: { email: 'customer@example.com' },
        ...overrides,
      },
    }),
  };
}

test('verifies the v3 verif-hash header in constant time', () => {
  assert.equal(verifyFlutterwaveV3WebhookSecretHeader({ headerValue: 'shared-secret', secretHash: 'shared-secret' }), true);
  assert.equal(verifyFlutterwaveV3WebhookSecretHeader({ headerValue: 'wrong-secret', secretHash: 'shared-secret' }), false);
  assert.equal(verifyFlutterwaveV3WebhookSecretHeader({ headerValue: undefined, secretHash: 'shared-secret' }), false);
  assert.equal(verifyFlutterwaveV3WebhookSecretHeader({ headerValue: '', secretHash: '' }), false);
});

test('normalizes only the required charge webhook fields', () => {
  const normalized = normalizeFlutterwaveV3WebhookPayload(chargeWebhook());

  assert.equal(normalized.kind, 'charge.completed');
  assert.equal(normalized.provider, 'FLUTTERWAVE');
  assert.equal(normalized.apiVersion, 'v3');
  assert.equal(normalized.providerTransactionId, '285959875');
  assert.equal(normalized.paymentReference, 'matinee-booking-123');
  assert.equal(normalized.providerStatus, 'successful');
  assert.equal(normalized.providerAmount, 15000);
  assert.equal(normalized.currency, 'NGN');
  assert.equal(normalized.dedupeKey, 'flw-v3:charge.completed:CARD_TRANSACTION:285959875:successful');
  assert.equal(normalized.customer, undefined);
  assert.equal(normalized.card, undefined);
});

test('marks unsupported Flutterwave events without throwing', () => {
  const normalized = normalizeFlutterwaveV3WebhookPayload({ event: 'transfer.completed', data: { id: 1 } });
  assert.equal(normalized.kind, 'unsupported');
  assert.equal(normalized.eventType, 'transfer.completed');
});

test('rejects malformed charge webhook payloads', () => {
  assert.throws(
    () => normalizeFlutterwaveV3WebhookPayload(chargeWebhook({ amount: undefined })),
    (error) => error instanceof FlutterwaveV3AdapterError && error.code === 'invalid_event',
  );
});

test('builds a v3 verification request with bearer authentication', () => {
  const request = buildFlutterwaveV3VerifyTransactionRequest({
    transactionId: 285959875,
    secretKey: 'test-secret-key',
  });

  assert.equal(request.url, 'https://api.flutterwave.com/v3/transactions/285959875/verify');
  assert.equal(request.method, 'GET');
  assert.equal(request.headers.Accept, 'application/json');
  assert.equal(request.headers.Authorization, 'Bearer test-secret-key');
});

test('normalizes a verified transaction without approving it', async () => {
  let capturedUrl;
  const adapter = createFlutterwaveV3Adapter({
    fetchImpl: async (url) => {
      capturedUrl = url;
      return verificationResponse();
    },
  });

  const result = await adapter.verifyTransaction({ transactionId: 285959875, secretKey: 'test-secret-key' });

  assert.equal(capturedUrl, 'https://api.flutterwave.com/v3/transactions/285959875/verify');
  assert.equal(result.providerTransactionId, '285959875');
  assert.equal(result.paymentReference, 'matinee-booking-123');
  assert.equal(result.providerStatus, 'successful');
  assert.equal(result.providerSettledAmount, 14900);
  assert.equal(result.customer, undefined);
});

test('marks verification transport failure as retryable', async () => {
  const adapter = createFlutterwaveV3Adapter({
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });

  await assert.rejects(
    () => adapter.verifyTransaction({ transactionId: 1, secretKey: 'test-secret-key' }),
    (error) => error instanceof FlutterwaveV3AdapterError && error.retryable === true,
  );
});
