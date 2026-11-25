# TRAFFIC.md — Matinee traffic management design

## Decision boundary

Requirement 5 originally proposed Redis `SET NX` holds, a waiting room, WebSockets/SSE, and a 10-minute hold. Those conflict with `AGENTS.md` and the PRD:

- PostgreSQL must remain authoritative for holds and bookings.
- PostgreSQL constraints, not Redis alone, must enforce the one-live-allocation invariant.
- A virtual waiting room and WebSocket live seat updates are MVP non-goals.
- Polling is sufficient for MVP.
- The working hold expiry assumption is 5 minutes unless a separate decision approves a change.

The selected direction is **Keep PRD/AGENTS**.

## Correctness under concurrency

### Planned authoritative hold flow

The future hold endpoint must:

1. Validate the authenticated customer and request schema.
2. Resolve seats valid for the showtime and hall.
3. Acquire all requested seats in one PostgreSQL transaction using conditional updates.
4. Enforce a partial unique constraint for live allocations on `(showtimeId, seatId)`.
5. Fail all-or-nothing: no partial hold if one seat cannot be acquired.
6. Set `Hold.expiresAt` from the server.
7. Persist durable expiry work before responding.
8. Return the authoritative expiry timestamp to the client.

Redis `SET NX` may only be a advisory fast-path/cache in the future. It must never be the final allocator. A Redis cache miss, expiry error, or restart cannot be allowed to double-allocate a seat.

This flow is not implemented because the inventory/booking schema is not approved.

### Client behavior

- Any seat-map countdown is display-only.
- The client must refresh seat state by polling and must not overwrite newer inventory state with a stale response.
- Seat-map responses must not expose another customer's identity or booking information.

## Load shaping

### Rate limiting

Implemented in `Backend/movieRateLimiter.js`:

- Counters are stored in Redis, shared across app instances.
- Both IP and authenticated user keys are counted.
- Requests above the limit receive `429` with `Retry-After`.
- Redis failure fails closed with `503`.
- Current limits apply to movie catalog endpoints, including search.

Future hold and checkout endpoints must use the same shared limiter mechanism before entering domain work. Specific per-user and per-IP thresholds are operational configuration, not business policy.

### Waiting room

Not implemented. The PRD excludes a virtual waiting room from MVP. Surge handling uses rate limits, bounded caches, clear `429`/`503` responses, and retry UI instead.

If a waiting room is later approved, it must be designed outside the current MVP release gate and must not become the authority for seat allocation.

### Caching

Implemented:

- TMDB movie data is cached in Redis with TTLs and bounded stale responses.
- TMDB is not called for every request during a surge.
- Cache-source metadata is returned to clients.

Not implemented:

- Seat-map caching, because no seat-map endpoint or canonical inventory table exists.
- WebSockets or SSE, because the PRD excludes them from MVP.

Planned seat-map approach:

- Poll every few seconds.
- Include server version/updated-at metadata so stale responses cannot overwrite newer state.
- Keep availability derived from authoritative PostgreSQL state.
- Never expose another user's identity in seat maps.

Polling is chosen because it satisfies MVP freshness with simple, observable infrastructure and avoids the excluded real-time transport scope.

## Graceful failure

Implemented in `Frontend/screens/DiscoveryScreen.jsx` and `MovieDetailsScreen.jsx`:

- `429` and `503` render “Too many people are browsing” with a retry action.
- The screen does not crash or blank.
- The backend returns safe JSON errors and request IDs for support correlation.

## Observability

- Every request has an `X-Request-Id`.
- Structured logs include method, path, status, read consistency, event, and request ID.
- Sensitive fields are redacted.
- Server and app error tracking is local and structured; no external vendor is configured.
- Operational monitoring must watch 429/503 rates, oldest job age, webhook lag, refund failures, and lock contention once those workflows exist.

## k6 load test

`tests/load/hold-contention.js` is a scaffold for 500 virtual users contending for 50 seats. It includes:

- One hold request per VU.
- Seat assignment by VU modulo seat count.
- Idempotency keys.
- p95 latency and error-rate thresholds.
- Per-seat success counters with `count<=1` thresholds to detect double allocation.

It has not been run. k6 is not installed here, and no authoritative hold endpoint exists yet. No response-time, error-rate, or zero-double-booking proof is claimed.

When the endpoint exists, the required report must include:

- Exact k6 command and environment.
- Threshold results.
- Request IDs correlated with structured server logs.
- Database evidence that no seat has more than one live allocation.
- Explanation of any 409/423/429 responses.

## Sharding and hot showtime risk

See `SHARDING.md`. Key point: one blockbuster showtime can create a hot shard, but its inventory must not be split because that would violate the allocation invariant. Mitigation is read caching/replicas, admission control, bounded expiry work, monitoring, and whole-showtime shard relocation if approved.
