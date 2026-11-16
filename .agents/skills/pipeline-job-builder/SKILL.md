---
name: pipeline-job-builder
description: Use for background jobs, worker stages, durable processing, queue/job types, event processors, notification delivery, reconciliation, batch work, or exports.
---

# Pipeline Job Builder

## Trigger
Anything executed asynchronously: job definitions, workers, event processors, notification outbox, payment/refund processing, reconciliation, ticket issuance, expiry cleanup, settlement tasks, batch handling, or exports.

## Architecture constraints
- Matinee MVP prefers a durable database-backed job system. Do not add BullMQ, Redis, a separate queue service, or microservices unless repository evidence and an approved decision demonstrate the need.
- Persist work before acknowledging the originating request/event. A worker must not be the only record that work is owed.
- All instances share durable state. Use the repository's lease/claim/coordination pattern so multiple workers cannot apply conflicting effects.
- Jobs are at-least-once. Make every handler idempotent; retries must not create duplicate charges, refunds, tickets, ledger entries, notifications with unintended effects, or admissions.
- Use bounded exponential backoff, retry limits, visible terminal failure, and a dead-letter/manual-review path where appropriate. Do not swallow errors.
- Keep domain rules in their owning modules. Workers orchestrate module interfaces; they do not reach into another module's private implementation.

## Job granularity and lifecycle
- One job should represent one recoverable business operation or bounded unit of work, with stable identity and explicit input references. Avoid a single opaque job that performs an unbounded pipeline.
- Separate durable intake from business processing. For provider events: persist the verified event, then process it; if processing crashes, retry from the persisted event.
- Persist job type, logical operation/reference, state, attempt count, next-attempt time, lease/claim data, timestamps, and safe failure metadata according to the existing schema. Do not add fields/tables without schema approval.
- Claim work atomically with a lease/conditional update. Handle lease expiry and worker restart safely. A stale worker must not overwrite a newer successful result.
- Keep external side effects outside long database transactions. Persist intent/state first, call the provider, then persist the outcome with an idempotency key and recovery path.
- For multi-record domain changes, use transactions and constraints. For notifications, write the outbox intent in the same transaction as the business state change.
- Make batch work bounded, restartable, observable, and safe to replay. Record per-item outcomes when partial progress is allowed by an approved contract.

## Cost gates, PARTIAL semantics, export watermark, and diagram edges
The Matinee PRD defines no three ordered AI cost gates, no `PARTIAL` batch result contract, no export watermark rule, and no pipeline diagram-edge specification. Matinee also explicitly excludes AI from authoritative booking, payment, refund, ticket, admission, inventory, and settlement decisions. Do not invent gate order, token/budget thresholds, `PARTIAL` meaning, watermark placement/logic, or diagram edges. If a task depends on these concepts, request the canonical approved specification and tests before implementation. Do not spend on AI for Matinee based on this skill alone.

## Required Matinee workflows
- **Payment inbox:** verify and persist a provider event before webhook acknowledgement; processing is retryable and idempotent.
- **Notifications:** transactional outbox; at-least-once delivery; record attempts/outcome/next retry; delivery failure does not undo a confirmed booking.
- **Hold expiry:** `Hold.expiresAt` is authoritative. Cleanup is bounded and repeatable; a worker schedule never determines whether a hold is valid.
- **Refund/reconciliation:** retain provider outcomes, durable exception cases, retries, manual-review ownership, and auditable final states.
- **Settlement:** preserve immutable settlement history; late refunds/chargebacks create later adjustment entries, not edits to settled history.

## Observability and tests
Expose pending, leased/running, retrying, failed, completed, and manual-review states. Monitor oldest pending age, retry counts, lease expiry, failed jobs, webhook lag, refund failures, reconciliation aging, and outbox lag. Test duplicate delivery, two workers claiming the same item, crash before/after external side effect, lease expiry, DB interruption, out-of-order events, retry exhaustion, and restart recovery. Use PostgreSQL integration/concurrency tests for database guarantees.