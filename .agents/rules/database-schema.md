# Database Schema Rules — Matinee

## 1. Authority

- PostgreSQL is the authoritative production database.
- Prisma is the application data-access and schema-management layer.
- Use reviewed SQL migrations for database invariants Prisma cannot express.
- Read `AGENTS.md` and the relevant PRD sections before changing the schema.
- Do not treat a proposed schema as implemented until migrations and tests prove it.
- Do not invent unresolved business rules in database defaults, constraints, or triggers.

## 2. Schema design principles

- Model the actual Matinee domain: users, roles, cinema memberships, cinemas, halls, seats, showtimes, showtime inventory, holds, bookings, booking seats, payment attempts, provider events, refunds, tickets, scans, ledger entries, settlements, jobs, notifications, idempotency records, and audit events as required by the approved design.
- Give each entity a clear owner and purpose.
- Use explicit relationships and foreign keys.
- Use stable identifiers.
- Avoid storing the same authoritative fact in multiple places.
- If data is denormalized for performance, identify its source of truth and provide a safe rebuild or reconciliation method.
- Store timestamps in UTC.
- Define cinema-local time-zone behaviour explicitly at application boundaries.
- Use appropriate decimal/integer database types for non-currency measurements. Persist money as integer kobo.
- Add indexes based on actual query and constraint requirements, not speculation.

## 3. PostgreSQL is mandatory for integrity verification

- Test production schema behaviour against PostgreSQL.
- SQLite may be used for local development or isolated unit tests only.
- Do not use SQLite tests as evidence for PostgreSQL locking, partial unique indexes, transaction isolation, or concurrency guarantees.
- Test migrations on a clean database and on an upgrade from the previous supported release.
- Test the actual constraints used to protect business invariants.
- Do not bypass a failing PostgreSQL test by weakening the constraint.

## 4. Showtime inventory invariants

- Treat `(showtimeId, seatId)` as the unique identity of a seat's inventory for a showtime.
- Enforce uniqueness for each showtime-seat inventory row.
- Enforce that a seat belongs to the hall used by the showtime.
- Enforce that a booking seat belongs to the same showtime and hall context as its booking.
- Enforce that a showtime seat cannot be allocated to multiple active holds.
- Enforce that a showtime seat cannot be allocated to multiple live confirmed bookings.
- Use appropriate foreign keys, composite keys, unique indexes, partial unique indexes, check constraints, transactions, and reviewed SQL where necessary.
- Application validation alone is not sufficient for critical seat-allocation invariants.
- A multi-seat hold must be all-or-nothing.
- Acquire overlapping inventory in a deterministic order where applicable to reduce deadlocks.
- Re-check availability and expiry inside the transaction.
- Roll back all requested seat allocations if any requested seat cannot be acquired.
- Never allow hold cleanup to release a consumed hold or a seat allocated to a confirmed booking.

## 5. Hold expiry

- `Hold.expiresAt` is the single authoritative hold-expiry timestamp.
- Store it as a UTC timestamp.
- A hold is logically expired when database time is at or beyond `expiresAt`.
- Do not rely on a cleanup worker to make an expired hold invalid.
- Every operation that consumes or releases a hold must verify its validity inside the relevant transaction.
- Do not maintain competing authoritative expiry timestamps.
- If a denormalized expiry field is needed for query performance, update it atomically and make it rebuildable from `Hold.expiresAt`.
- Hold state changes must be conditional and idempotent.

## 6. Booking and payment consistency

- Model booking and payment as separate but related entities and state machines.
- Do not infer booking confirmation solely from a payment status field.
- Enforce required relationships between booking, showtime, booking seats, holds, and tickets.
- A confirmed booking must have the expected number of booking-seat records and corresponding tickets.
- Create confirmation-related records atomically where the approved workflow requires it.
- Keep provider events durable and uniquely identifiable.
- Enforce deduplication using provider event identity or a documented provider-specific key.
- Store idempotency keys with their scope, request fingerprint, status, and result reference.
- Reject reuse of an idempotency key with a different request payload.
- Keep payment mismatch and recovery records durable and queryable.

## 7. Financial records

- Store all persisted monetary values as integer kobo.
- Store currency explicitly where financial records require it.
- Keep ticket price, booking fee, taxes, provider fees, refunds, adjustments, and cinema settlement amounts distinguishable.
- Do not hard-code unapproved booking-fee, tax, refund, provider-fee allocation, or settlement formulas.
- Use immutable ledger or append-only financial records.
- Correct financial history through reversal or adjustment entries.
- Do not update or delete historical financial entries to hide a mismatch.
- Link late refunds, chargebacks, and adjustments to the original transaction.
- Do not mark a settlement run paid merely because a payout request was submitted.

## 8. Provider events and durable processing

- Persist a valid provider event before acknowledging receipt.
- Store provider event identity, payment reference, received timestamp, signature-validation outcome, processing status, attempt count, and correlation information.
- Minimize stored payload fields and restrict access.
- Keep event persistence separate from event processing.
- A stored but unprocessed event must remain retryable.
- Mark an event processed only after its business transaction commits.
- Make event processing idempotent.
- Unknown event types must be recorded and surfaced for review, not silently discarded.

## 9. Jobs and outbox records

- Persist durable job and notification intent records in the database transaction that creates the work where required.
- Job records must support status, availability time, lease/lock ownership, lease expiry, attempt count, last error, timestamps, and correlation ID as appropriate.
- Claim jobs with cross-instance-safe leases, locking, or equivalent coordination.
- Make job execution safe under duplicate delivery and retry.
- Use bounded exponential backoff with jitter.
- Provide failed/dead-letter/manual-review states.
- Monitor queue depth, oldest pending age, retry rate, failed jobs, and lease expiry.

## 10. Audit and retention

- Keep sensitive administrative actions auditable.
- Audit records should identify actor, action, entity, timestamp, request/correlation ID, and relevant before/after values with sensitive fields redacted.
- Preserve payment, refund, booking, ticket, and settlement history according to approved retention and legal-hold policies.
- Do not cascade-delete financial or audit history when deleting a user or cinema.
- Do not invent a retention period. Use the approved data-retention decision.
- Apply soft deletion or anonymization only according to the approved privacy and financial-retention policy.

## 11. Migration rules

- Deliver every schema change as a versioned migration.
- Never use schema push as the production migration strategy.
- Keep Prisma schema and migration history aligned.
- Use reviewed raw SQL migrations for partial unique indexes, exclusion constraints, check constraints, triggers, or other unsupported invariants.
- Make migrations safe for the deployment process.
- Consider table size, locks, backfills, defaults, and rollback/recovery when planning migrations.
- Do not silently drop or rewrite production data.
- Include data backfills and validation steps when a migration changes existing records.
- Fail CI or release checks on migration drift or missing required constraints/indexes.
- Test clean-database creation and previous-version upgrades.

## 12. Required invariant audit

Maintain a reproducible database audit script or query set that checks at least:

- Duplicate showtime-seat inventory identities.
- Duplicate live allocations for a showtime seat.
- Booking seats that do not match their booking's showtime/hall.
- Orphaned holds, bookings, payments, tickets, refunds, or ledger references.
- Inconsistent booking/payment states.
- Confirmed bookings with missing or excess booking-seat/ticket records.
- Provider events acknowledged without durable persistence or left unprocessed beyond policy.
- Duplicate logical refunds or financial effects.
- Settlement totals that do not reconcile to their source entries.

Any integrity violation blocks release. In production, treat it as an incident and preserve evidence.

## 13. Schema change checklist

Before merging a schema change:

- [ ] The relevant PRD requirement and business invariant are identified.
- [ ] The source of truth for each new field is documented.
- [ ] Relationships and deletion behaviour are explicit.
- [ ] Required constraints and indexes exist in PostgreSQL.
- [ ] A versioned migration is included.
- [ ] Clean-install and upgrade migration tests pass.
- [ ] Concurrency/invariant tests are included where relevant.
- [ ] Backfill and rollback/recovery implications are documented.
- [ ] Sensitive data and retention implications are reviewed.
- [ ] The invariant audit is updated where necessary.