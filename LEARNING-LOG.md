# LEARNING-LOG.md

Last updated: 2026-11-25

## Concurrency and seat allocation

- Studied the race condition where two users read the same seat as free and both proceed.
- Redis `SET NX` is atomic for a single Redis key and useful for advisory coordination, but it cannot replace PostgreSQL authority for Matinee because Redis failure or cache loss must not decide allocation.
- The correct MVP direction is a PostgreSQL transaction with conditional updates and a partial unique constraint for live `(showtimeId, seatId)` allocations.
- Multi-seat holds must be all-or-nothing.
- `Hold.expiresAt` is authoritative; worker timing and client countdowns are not.
- Applied in `TRAFFIC.md`. Not implemented because inventory schema approval is still pending.

## Traffic shaping

- Per-user and per-IP counters were implemented with Redis increment/expiry in `Backend/movieRateLimiter.js`.
- Rate-limit failure currently fails closed with `503` and includes `Retry-After` on `429`.
- A virtual waiting room was rejected as out of MVP by the PRD; clear overload messages and retry actions were implemented instead.
- Polling was selected over WebSockets/SSE because polling is sufficient for MVP and explicitly allowed by the project rules.

## Caching

- TMDB catalog responses are cached in Redis with TTLs and bounded stale reads.
- Cache metadata is returned to clients via `X-Matinee-Cache-Source` and `X-Matinee-Cache-Age-Seconds`.
- Future seat-map caching must include version/updated-at metadata so stale responses cannot overwrite newer inventory state.

## Database reliability

- Connection pools are bounded by `DATABASE_POOL_MAX`, with idle and connection timeouts.
- Separate primary and replica pools are supported through `DATABASE_READ_URL`.
- Read-your-own-writes is implemented with a response-header pin that the mobile client echoes on later requests.
- Sharding was planned in `SHARDING.md`; one showtime's inventory must remain on one shard to preserve the allocation invariant.
- Hot-shard mitigation relies on caching, replicas, rate limits, bounded expiry jobs, monitoring, and whole-showtime relocation.

## Durable jobs

- Studied the existing `EmailJob` lease/claim/retry pattern.
- Added a `system.*` job scaffold for provider webhooks, hold-expiry sweeps, and refund processing using the existing durable store.
- Jobs persist reference, bounded payload, attempts, run time, lease ownership, lease expiry, and safe failure text.
- Unapproved handlers move jobs to `manual_review` without side effects.
- Real webhook, hold-expiry, and refund processing remain blocked by schema and policy approvals.

## Observability

- Added request IDs, structured JSON logs, status/path/read-consistency logging, and sensitive-field redaction.
- Added app-side error logging for unhandled React Native errors and failed API responses.
- API failures include `requestId` where available.
- No external error-tracking vendor was added because no vendor choice is approved.

## Flutterwave v3 study

Official documentation consulted:

- `https://developer.flutterwave.com/docs/webhooks`
- `https://developer.flutterwave.com/api/transactions/verify-transaction`
- `https://developer.flutterwave.com/docs/transaction-verification`
- `https://developer.flutterwave.com/docs/payment-operations/refunds`
- `https://developer.flutterwave.com/docs/payment-operations/chargebacks`
- `https://developer.flutterwave.com/docs/error-timeouts`
- `https://developer.flutterwave.com/v4/docs/idempotency`

Key findings:

- v3 webhooks use the `verif-hash` shared-secret header.
- Verification uses `GET /v3/transactions/{id}/verify` with a bearer secret key.
- Verification must check reference, expected amount, currency, and provider status.
- Refund processing uses `POST /v3/transactions/{id}/refund`.
- Timeout errors can mean processing is still in progress; query status before retrying.
- v4 documents `X-Idempotency-Key`, but the project selected v3; v3 idempotency guarantees still need written evidence.

Implemented only a pure adapter and tests. No real money flow was activated.

## Verification habits

- Backend tests, Expo exports, request-ID smoke tests, and `git diff --check` were run after changes.
- k6 was not installed, so no load test result is claimed.
- PRD/AGENTS blockers are recorded instead of guessed.
