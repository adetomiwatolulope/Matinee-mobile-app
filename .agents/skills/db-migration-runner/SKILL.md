---
name: db-migration-runner
description: Use for every database schema change, Prisma model or migration edit, new persisted data, index, constraint, trigger, or data backfill.
---

# Database Migration Runner

## Trigger
Any schema change; Prisma schema/model work; migration or migration repair; new persisted field/entity; index, constraint, trigger, enum, or data backfill.

## Source-of-truth ritual
1. Read `AGENTS.md` and the relevant Matinee PRD sections, especially §7.4, §10, §13–17.
2. Inspect the actual repository, current Prisma schema, migration history, PostgreSQL version, scripts, and existing production conventions. The PRD describes required semantics, not proof that a schema is already implemented.
3. Identify the business invariant, affected state transitions, data volume, lock/availability risk, rollback/forward-repair path, and retention implications.
4. Classify each requirement as confirmed, assumption, planning target, or unresolved blocker. Stop if the migration depends on an unresolved finance, provider, privacy, or inventory decision.

## Locked database principles
- PostgreSQL is the production source of truth. Prisma is the application data-access/schema tool; use versioned, reviewable migrations.
- Never use `prisma db push` or implicit schema synchronization as a production migration strategy.
- SQLite tests do not prove PostgreSQL constraint, lock, transaction, or concurrency behaviour.
- Add reviewed raw SQL migrations for partial unique indexes, exclusion/check constraints, triggers, or other invariants Prisma cannot express.
- Keep schema and SQL migration history aligned. CI must detect migration drift and missing required constraints/indexes.
- Do not assume the proposed PRD schema is implemented. Review the checked-in Prisma schema and SQL together before changing either.

## Safe migration sequence
1. **Map invariant:** write down the invariant and the rows/state transitions it protects. For seat inventory, preserve at most one live hold or confirmed booking per `(showtime, seat)` and enforce same-showtime relationships at the database boundary.
2. **Inspect current state:** inspect schema, migration status, existing data, foreign keys, indexes, query plans, and all callers. Identify duplicates/orphans before adding constraints.
3. **Design compatible rollout:** prefer expand → backfill → validate → constrain → contract when deployment overlap or large tables make a one-step migration unsafe. Do not drop/rename/retype data until all readers/writers are migrated and rollback implications are understood.
4. **Write migration:** use an immutable, descriptive migration. Include PostgreSQL-specific SQL for invariants Prisma cannot express. Include explicit nullability/default/backfill decisions and a forward-repair note for risky changes.
5. **Backfill safely:** use bounded, restartable batches and idempotent predicates. Do not hold a long transaction or lock a hot table unnecessarily. Record progress and reconciliation counts.
6. **Prove constraints:** test duplicate, concurrent, invalid-transition, and rollback cases against PostgreSQL. Run the invariant audit; do not rely on SQLite.
7. **Deploy and verify:** apply using the repository's migration workflow, inspect migration status and production-safe verification queries, then monitor errors/locks/latency.
8. **Report:** list migration files, schema effects, backfill/repair strategy, tests and commands actually run, residual risks, and any approval still required.

## Money and ledger rules
- Persist all monetary values as integer NGN kobo. Never use binary floating-point for money.
- Calculate authoritative prices server-side; never trust client totals.
- Keep ticket face value, booking fee, taxes, provider charges, refunds, cinema payable, payouts, reversals, and adjustments distinct.
- Snapshot applied financial terms on the booking/transaction so later configuration changes do not rewrite history.
- Do not hard-code or activate booking fee, tax, provider-fee allocation, refund, rounding, or settlement formulas until Product/Finance approval and worked examples exist.
- Preserve financial history with immutable ledger entries and traceable compensating/adjustment entries; never rewrite or delete historical financial facts.

## Deletion and retention
- Do not invent cascade deletion. Inspect the actual FK graph and the PRD's legal/financial retention decisions before implementing deletion.
- Account deletion is soft deletion followed by anonymization only after retention/legal/financial obligations are satisfied; it is blocked while the user has an upcoming confirmed booking. The old 30-day assumption is explicitly not automatic.
- Refunds, payment events, tickets, ledger entries, audit history, and settlement history must not be destructively deleted.
- Preserve financial/legal records and apply the approved retention schedule. The PRD does not define a universal child-first cascade order; obtain an approved deletion plan for each aggregate.

## Tests
Test clean install and upgrade, PostgreSQL constraints/indexes, concurrent seat holds, all-or-nothing multi-seat holds, expiry races, booking-seat integrity, idempotent backfills, rollback/forward repair, migration drift, and retention/deletion restrictions. Never claim PostgreSQL guarantees from SQLite-only tests.