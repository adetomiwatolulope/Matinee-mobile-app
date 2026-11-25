# SHARDING.md — Matinee sharding plan

Status: plan only. No sharding or simulation is implemented. PostgreSQL remains the single authoritative transactional store for MVP.

## Principles

- Keep every invariant that must be atomic inside one shard.
- Do not split one showtime's canonical seat inventory across shards; that would break the one-live-allocation-per-showtime-seat invariant.
- Use integer kobo for all persisted money.
- Preserve immutable financial history; sharding must not require rewriting old payments, ledger entries, refunds, or settlements.

## Candidate shards

| Domain tables | Shard key | Reason |
|---|---|---|
| `User`, customer identity records | `userId` hash | Most identity reads/writes are per user. |
| `Cinema`, `Hall`, `Seat`, `CinemaStaff`, showtime setup | `cinemaId` hash | Admin operations are scoped to one cinema. |
| `Showtime`, `SeatInventory`, `Hold`, `BookingSeat`, `Ticket`, `Scan` | composite `(cinemaId, showtimeId)` hash with affinity | Keeps allocation, hold expiry, booking confirmation, ticketing, and scanning local to one shard. |
| `Booking`, `Payment`, `PaymentEvent`, `LedgerEntry`, `Refund` | `bookingId` hash | Keeps booking/payment/ledger/refund effects for one purchase in one transactional boundary. |
| `Settlement`, `SettlementAdjustment` | `cinemaId` plus settlement period | Settlement is cinema-scoped and historically immutable. |

## Hot shard risk

A single blockbuster showtime can concentrate all hold, expiry, booking, and scan traffic on one shard. The invariant forbids splitting that showtime's inventory across shards, so naive horizontal distribution cannot solve this alone.

Mitigations:

1. Route reads to replicas and serve movie/catalog data from cache; keep only authoritative allocation writes on the primary shard.
2. Apply the shared per-user/IP rate limits and surge messaging before requests reach the database.
3. Use bounded hold-expiry sweeps indexed by `expiresAt` instead of full-table scans.
4. Monitor per-showtime write rate, lock wait, oldest job age, and 429/503 rates; pre-provision capacity for approved launch events.
5. If one showtime remains hot, move that entire showtime's key range to a dedicated shard with higher capacity; never split its seats.
6. Use asynchronous read models for analytics and admin dashboards; never run cross-shard analytical queries on authoritative tables.

## Cross-shard rules

- Cross-shard reads use read models or durable jobs, not synchronous distributed transactions.
- Cross-shard financial reporting reconciles immutable per-booking records into derived reports.
- Manual-review queues retain the owning shard key, correlation ID, and actor references.
- Indexes for `expiresAt`, `(showtimeId, seatId)`, provider event IDs, and idempotency keys must exist on every shard before production traffic.
