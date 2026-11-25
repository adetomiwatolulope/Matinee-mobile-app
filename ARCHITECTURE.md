# ARCHITECTURE.md

## Product invariant

A physical seat for a specific showtime may be allocated to no more than one live hold or confirmed booking at a time. A confirmed paid booking must remain recoverable and auditable even when a provider, worker, network, or application instance fails.

PostgreSQL is authoritative for transactional state. Redis is advisory infrastructure for cache and rate limits. The mobile client never decides seat availability, payment success, refund success, ticket validity, or admission.

## Current system shape

```text
Frontend (Expo / React Native)
  -> Frontend/api.js
  -> Backend Express API
       -> auth middleware + Zod boundary validation + shared Redis rate limits
       -> services (registration, verification, TMDB catalog)
       -> PostgreSQL through Prisma primary/replica clients
       -> Redis cache and rate-limit counters
       -> durable job workers (email jobs + system job scaffold)
```

### Frontend

- `Frontend/App.js` is a small stage-based navigator, not a React Navigation stack.
- Screens live in `Frontend/screens/`.
- Reusable UI lives in `Frontend/components/ui.jsx`.
- Theme tokens live in `Frontend/designTokens.js` and `Frontend/theme/ThemeContext.jsx`.
- The system color scheme selects light/dark; there is no manual theme toggle.
- `Frontend/api.js` carries auth tokens, request-ID-aware error objects, and primary-read pinning after writes.
- `Frontend/errorTracking.js` logs unhandled app errors and failed API responses without tokens or credentials.

### Backend

- `Backend/index.js` defines routes and boundary checks.
- `Backend/config.js` validates environment configuration at startup.
- `Backend/prismaClient.js` creates bounded primary and optional replica pools.
- `Backend/databaseRouting.js` defines the primary-read pin contract.
- `Backend/logging.js` provides request IDs, structured logs, redaction, and process error tracking.
- `Backend/movieRateLimiter.js` applies shared per-user and per-IP Redis limits.
- `Backend/tmdbAdapter.js` and `Backend/tmdbCatalogService.js` isolate TMDB access and Redis-backed caching.
- `Backend/flutterwaveV3Adapter.js` is a pure, non-authoritative Flutterwave v3 normalization/verification-request adapter.
- `Backend/emailJobs.js` is the existing durable worker pattern.
- `Backend/systemJobs.js` is a durable scaffold for webhook, hold-expiry, and refund jobs; handlers are not approved yet.

### Data

- PostgreSQL schema and migrations are under `Backend/database/prisma/`.
- The schema is explicitly marked demo/non-PRD. It currently contains identity, email-job, and registration-idempotency tables.
- Booking, hold, payment, ledger, refund, ticket, scan, cinema, hall, seat, and showtime tables are not implemented.
- `SHARDING.md` is a plan only; no sharding is implemented.

## Request flow

1. `requestIdMiddleware` creates or accepts a request ID and returns it in `X-Request-Id`.
2. CORS and JSON parsing run.
3. `requestFinishLogger` records method, path, status, and read consistency.
4. Database routing reads `X-Matinee-Read-Consistency`.
5. Protected routes verify JWT before validation and domain work.
6. Zod validates request input at the boundary.
7. Rate limits use Redis counters keyed by IP and authenticated user where available.
8. Writes use the primary Prisma client. Reads use the replica client only when `DATABASE_READ_URL` is configured and no primary pin is active.
9. Successful writes set the primary-read header and TTL so the mobile client avoids stale replica reads.
10. Errors use safe JSON responses and structured logs with request IDs.

## Boundaries and ownership

- Route handlers perform boundary checks and call services; they do not own business rules.
- Provider-specific Flutterwave response shapes must not leak into booking or ledger modules.
- Booking, inventory, payment, refund, ticket, and settlement rules must live in their owning domain modules once implemented.
- Jobs orchestrate approved domain operations; workers must not contain financial or inventory policy.
- UI components display server-provided state and never calculate authoritative money or availability.

## What is intentionally absent

- No customer-facing web booking; `apps/web/` is a placeholder.
- No virtual waiting room.
- No WebSocket or SSE live seat updates.
- No Redis-authoritative holds.
- No real Flutterwave checkout, webhook processing, refunds, or settlement.
- No QR dependency or ticket admission flow.
- No schema for cinemas, halls, seats, showtimes, holds, bookings, payments, ledger, refunds, or tickets.

## Key documents

- `AGENTS.md` and `docx/matinee-prd.md` — source of truth.
- `TRAFFIC.md` — traffic management decisions.
- `docs/backend-system-design.md` — pooling, routing, jobs, observability.
- `SHARDING.md` — future data distribution plan.
- `COMPONENTS.md` — UI inventory and conventions.
