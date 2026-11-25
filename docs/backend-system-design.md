# Backend system design

Status: partial implementation. Items blocked by product, finance, legal, or schema approvals are called out explicitly.

## Connection pooling

`Backend/prismaClient.js` creates bounded `pg.Pool` instances for PostgreSQL:

- `DATABASE_POOL_MAX` defaults to `10` connections per pool.
- `DATABASE_POOL_IDLE_TIMEOUT_MS` defaults to `10000`.
- `DATABASE_POOL_CONNECTION_TIMEOUT_MS` defaults to `5000`.
- `DATABASE_READ_URL` optionally creates a separate replica pool; without it, reads use the primary pool.

This is justified because a traffic surge must not create unbounded PostgreSQL connections across app instances. Separate primary and replica pools protect write capacity and make read/write routing explicit.

## Read/write routing and read-your-own-writes

- Writes always use the primary Prisma client.
- Reads use the replica client when `DATABASE_READ_URL` is configured.
- A client can request primary reads with `X-Matinee-Read-Consistency: primary`.
- Successful write responses set the same header plus `X-Matinee-Primary-Read-Ttl-Seconds`.
- `Frontend/api.js` remembers that TTL and sends the primary-read header on subsequent requests, giving read-your-own-writes without stale replica reads.
- When no replica is configured, both read and write clients are the primary client.

Auth reads and session reads currently use the routed read client and honor the primary pin. Movie catalog reads are Redis/TMDB-backed and do not use PostgreSQL.

## Background jobs

`Backend/systemJobs.js` defines durable job types:

- `system.provider_webhook`
- `system.hold_expiry_sweep`
- `system.refund_processing`

The current schema has only the general `EmailJob` table, so the scaffold uses that table as the durable store with explicit `system.*` job types. Jobs persist type, reference, bounded payload, attempts, `runAt`, lease owner, lease expiry, and safe failure text. Claiming uses a conditional update so multiple workers cannot process the same job. Failures use bounded backoff, retry limits, and `manual_review`.

No real provider webhook processing, hold expiry cleanup, or refund processing is activated:

- Webhook processing requires the approved Flutterwave event schema and durable payment domain tables.
- Hold expiry requires the authoritative PostgreSQL hold/inventory schema; `Hold.expiresAt` remains authoritative and worker timing never determines validity.
- Refund processing requires Product/Finance refund policy, provider capability evidence, payment/ledger schema, and approval workflow.

Until approved handlers exist, due jobs move to `manual_review` without side effects.

Required order for future webhook jobs: verify signature, persist raw-normalized verified event, acknowledge, then process asynchronously and idempotently.

## Observability

- Every request receives a request ID from `X-Request-Id` or a generated UUID, returned in the `X-Request-Id` response header.
- Structured server logs include timestamp, level, event, request ID, method, path, status, and read consistency.
- Sensitive fields such as `authorization`, `password`, `token`, `code`, and `secret` are redacted from logs.
- API failures return `requestId` in the JSON error body where available.
- `Frontend/errorTracking.js` logs unhandled React Native errors and failed API responses with event, status/path, and request ID; it never logs tokens or credentials.
- Server process error tracking logs uncaught exceptions and unhandled rejections.

## Load test write-up

No load test was executed for this requirement. `tests/load/hold-contention.js` is a k6 scaffold, but k6 is not installed in this environment and the authoritative hold endpoint does not exist yet. Therefore the logs contain no load-test request IDs, latency samples, or error-rate samples to report.

What was actually verified: backend unit tests pass, Expo Android/iOS exports pass, and `git diff --check` reports only existing CRLF warnings. Once the hold endpoint exists, run the k6 scaffold and correlate its `X-Request-Id` values with structured server logs before claiming response-time or double-booking results.
