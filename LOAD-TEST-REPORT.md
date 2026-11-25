# LOAD-TEST-REPORT.md

Generated: 2026-11-25

## Status

**No load test was executed.** This report documents the scripts, exact commands, thresholds, and evidence required. It does not claim latency, error-rate, concurrency, or zero-double-booking results.

Reasons:

- `k6` is not installed in the current environment.
- The authoritative hold endpoint does not exist yet.
- The inventory/booking schema does not exist yet, so PostgreSQL allocation invariants cannot be queried.
- Booking fee, refund, hold race, and seat-inventory policies remain blocked by the PRD decision register.

## Scripts

| Script | Scenario | Target | Status |
|---|---|---|---|
| `tests/load/hold-contention.js` | 500 VUs, each attempts one seat from the same 50-seat pool | future authoritative hold endpoint | Ready to run when endpoint/schema exist; not run |
| `tests/load/search-surge.js` | 500 VUs for 60s against movie search | `GET /movies/search` | Ready to run when k6 and auth token are available; not run |

Both scripts write JSON summaries:

- `tests/load/hold-contention-summary.json`
- `tests/load/search-surge-summary.json`

Both scripts check that `X-Request-Id` is returned so k6 summary data can be correlated with backend structured logs.

## Thresholds

### Hold contention

- `http_req_failed < 5%`; network errors and unexpected 5xx responses fail the run.
- `p(95) http_req_duration < 2000ms`.
- `409`, `423`, and `429` are expected controlled outcomes.
- `200` and `201` are accepted holds.
- Per-seat `holds_successful{seat:<seatId>}` must be `count<=1` for each of the 50 seats.

The per-seat threshold is the client-side double-allocation signal. It is not sufficient alone; the database invariant query below is required.

### Search surge

- `http_req_failed < 5%`; network errors and unexpected 5xx responses fail the run.
- `p(95) http_req_duration < 2000ms`.
- `checks > 95%`.
- `200`, `429`, and `503` are expected outcomes.

## Commands

PowerShell:

```powershell
$env:MATINEE_HOLD_ENDPOINT="http://127.0.0.1:3001/holds"
$env:MATINEE_SHOWTIME_ID="<approved-showtime-id>"
$env:MATINEE_AUTH_TOKEN="<test-user-token>"
$env:MATINEE_VUS=500
$env:MATINEE_SEAT_COUNT=50
$env:MATINEE_MAX_DURATION="60s"

k6 run tests/load/hold-contention.js
```

Search surge:

```powershell
$env:MATINEE_SEARCH_ENDPOINT="http://127.0.0.1:3001/movies/search"
$env:MATINEE_AUTH_TOKEN="<test-user-token>"
$env:MATINEE_SEARCH_QUERY="action"
$env:MATINEE_VUS=500
$env:MATINEE_MAX_DURATION="60s"

k6 run tests/load/search-surge.js
```

## Required result table after a real run

| Metric | Hold contention | Search surge |
|---|---:|---:|
| VUs started | Not run | Not run |
| Requests | Not run | Not run |
| 2xx responses | Not run | Not run |
| 429 responses | Not run | Not run |
| 503 responses | Not run | Not run |
| Unexpected 5xx/network failures | Not run | Not run |
| p95 latency | Not run | Not run |
| Error rate | Not run | Not run |
| Threshold result | Not run | Not run |

## PostgreSQL proof required after a real hold run

Do not substitute k6 counters for database evidence. After the hold schema exists, run an invariant query equivalent to:

```sql
SELECT "showtimeId", "seatId", COUNT(*)
FROM "Hold"
WHERE status = 'active'
  AND "expiresAt" > NOW()
  AND "showtimeId" = $1
GROUP BY "showtimeId", "seatId"
HAVING COUNT(*) > 1;
```

Expected result: zero rows.

Also verify that no booking and live hold overlap for the same `(showtimeId, seatId)`. The exact table names and status values must follow the approved schema.

## Log correlation required after a real run

For each failed or anomalous k6 request:

1. Copy the returned `X-Request-Id`.
2. Find the matching structured backend log entry.
3. Confirm method, path, status, read consistency, and duration.
4. Record whether the response was acceptance, controlled rejection, or unexpected failure.

## What was verified instead

- Backend unit/integration suite: 40 passed, 2 skipped.
- Backend smoke test: `GET /health` returned `200 {"status":"ok"}` with an `X-Request-Id`.
- Expo exports: Android 1011 modules, iOS 1013 modules.
- k6 scripts were added and syntax-checked with Node ESM parsing.
- No load-test latency, error-rate, or double-booking claim is made.
