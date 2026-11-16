# AGENTS.md — Matinee

> **Purpose:** Binding implementation instructions for AI coding agents and human contributors working on Matinee.
>
> **Source of truth:** `Matinee Product Requirements Document (PRD) — v2`. Read the relevant PRD sections before changing behaviour. This file converts the PRD into engineering rules; it does not authorize new product scope.
>
> **Product:** Matinee  
> **Market:** Nigeria, Lagos first  
> **Currency:** NGN, persisted as integer kobo  
> **Platforms:** iOS and Android customer app; web/admin surfaces as specified by the PRD  
> **Status:** The PRD is a revised draft. Implementation approval is conditional on its blockers and release gates.

---

## 1. Project identity and non-negotiable principles

Matinee lets customers discover films, select a cinema and showtime, choose specific seats, pay, and retrieve tickets. Cinema Admins manage cinemas, halls, seats, and showtimes. Door Staff validate tickets. Platform Admins onboard cinemas and manage payment exceptions, refunds, and settlement operations.

Build around this invariant:

**A physical seat for a specific showtime may be allocated to no more than one live hold or confirmed booking at a time. A confirmed paid booking must remain recoverable and auditable even when a provider, worker, network, or application instance fails.**

Follow these principles in every change:

1. Preserve the PRD's explicit requirements and terminology.
2. Treat data integrity, payment correctness, access control, and auditability as release-critical.
3. Keep the database authoritative for bookings, inventory, payment state, ticket state, refunds, and settlement records.
4. Prefer simple, modular application architecture over premature microservices.
5. Make asynchronous work durable, observable, retryable, and idempotent.
6. Never claim a feature, migration, test, integration, or operational guarantee exists until it has been implemented and verified.
7. Do not silently turn a planning target, assumption, proposal, or unresolved decision into a requirement.
8. Do not invent business policy or external-provider capabilities. Record unresolved decisions and ask the responsible owner.

## 2. Locked choices, business rules, and architecture rules

### 2.1 Locked product and platform choices

- Build for the Nigeria-first market, with Lagos as the initial market.
- Use NGN for display and integer kobo for persisted monetary values.
- The customer product is an iOS and Android mobile app.
- Use Next.js and TypeScript for supported web and admin surfaces.
- Use PostgreSQL as the production relational database.
- Use Prisma for application data access and schema management, with versioned migrations.
- **Use Flutterwave as the payment provider.** This is an explicit project decision. Do not substitute Paystack, Stripe, or another provider.
- Keep the existing mobile framework and mobile codebase. Do not replace or migrate the mobile framework without an explicit approved decision.
- Use a modular application architecture. Do not introduce microservices merely to make the system appear more sophisticated.
- Use durable database-backed jobs for MVP where they satisfy the PRD's reliability requirements.

**Important distinction:** Flutterwave is the payment provider. Flutter is a mobile framework. Do not confuse the two. The mobile framework remains the existing project choice; the payment-provider choice is Flutterwave.

### 2.2 Business rules that code must enforce

#### Money and pricing

- Represent all persisted monetary amounts as integer minor units (kobo).
- Never use binary floating-point values for money calculations or persistence.
- Calculate authoritative prices on the server. Never trust client-submitted totals, fees, discounts, taxes, or settlement amounts.
- Keep ticket price, booking fee, taxes, provider charges, refunds, and cinema settlement amounts distinct in the data model and ledger.
- Do not activate or hard-code a booking fee, tax treatment, payment-fee allocation, refund formula, or settlement formula until the required Product and Finance decisions are approved.
- Use explicit, documented rounding rules for every monetary calculation.
- Preserve financial history. Correct mistakes with traceable compensating entries or approved adjustments; do not rewrite or delete historical financial facts.

#### Seat inventory and holds

- A seat belongs to a hall; a showtime belongs to a cinema/hall; a hold and booking must reference seats valid for that showtime.
- Enforce the one-live-allocation-per-showtime-seat invariant in PostgreSQL, not only in application code.
- Treat `Hold.expiresAt` as the authoritative hold-expiry timestamp.
- A countdown in the client is display-only. Client timers, worker timing, and polling must never determine whether a hold is valid.
- Acquire a requested set of seats all-or-nothing. Never leave a partial hold when one requested seat cannot be acquired.
- Serialize or otherwise safely coordinate concurrent attempts to hold overlapping seats.
- Expire holds using conditional, bounded, repeatable database operations.
- A stale seat-map response must never overwrite newer inventory state.
- Do not expose another customer's identity or booking information in seat-map responses.
- Seat blocks for operational or walk-up use must conflict atomically with active holds and bookings and must record an authorized actor and reason.
- Once sales have started, do not mutate the hall seat layout in a way that changes the meaning of existing bookings.

#### Booking and payment

- Model payment and booking as explicit state machines. Document allowed transitions and reject invalid transitions.
- Do not mark a booking paid because the client says payment succeeded or because the browser/app returned from a checkout page.
- Verify payment status through the provider's trusted verification mechanism and reconcile it with the expected amount, currency, reference, and booking.
- Persist provider events durably before acknowledging their receipt.
- Verify webhook signatures using the provider's documented mechanism.
- Handle duplicate, delayed, out-of-order, and retried provider events safely.
- Make payment processing, booking confirmation, and ledger effects idempotent.
- A successful provider payment and the corresponding booking confirmation must be coordinated through a recoverable workflow. Do not silently discard an event or leave an unexplained paid-but-unconfirmed state.
- Define and implement the approved race policy for payment success arriving after a hold expires or seats are no longer available. Never invent a policy or double-allocate inventory.
- Keep unresolved provider/booking mismatches visible in a retry or manual-review queue.
- Store only the provider payload data needed for verification, reconciliation, support, and audit. Restrict access to it.

#### Refunds and settlement

- Represent full and partial refunds accurately and separately from the original payment.
- Require the approved authorization and approval workflow for refunds and settlement actions.
- Make refund requests, provider outcomes, retries, and final results auditable.
- Reconcile provider records against internal payment and ledger records. Never silently overwrite a conflict.
- Keep settlement history immutable and traceable.
- Do not calculate or release cinema payouts until Finance has approved the gross ticket value, booking fee, tax, provider charge, refund, reserve, and settlement formulas that apply.
- Distinguish a refund being requested, submitted, pending, succeeded, and failed. Do not describe a pending refund as completed.

#### Tickets and admission

- QR content must be signed or opaque. Do not encode personal information or sensitive booking data in a QR code.
- Validate ticket state against the server-authoritative booking, payment, refund, cancellation, and scan state.
- Reject repeat scans. The scan operation must be atomic so simultaneous scans cannot admit the same ticket twice.
- Define a safe manual fallback for network interruption and document its limitations. An offline fallback must not create an unbounded duplicate-admission vulnerability.
- Do not let a screenshot, client-side QR decoder, or locally cached status independently authorize admission.

#### Roles and access

- Enforce authorization on the server for every protected operation.
- Scope Cinema Admin permissions to the relevant cinema. Never rely on a client-supplied cinema ID as proof of access.
- Keep Customer, Cinema Admin, Door Staff, and Platform Admin permissions distinct.
- Apply least privilege. Do not grant broad Platform Admin powers to cinema users or Door Staff.
- Audit sensitive administrative actions, including schedule changes, seat blocks, cancellations, refunds, settlement operations, and permission changes.
- Rate-limit authentication and other abuse-prone endpoints using a shared mechanism that works across application instances.
- Do not expose sensitive inventory, payment, or user data through public APIs.

#### Notifications and background processing

- Treat notification delivery as at-least-once. Make duplicate delivery safe.
- Persist work before relying on a worker to execute it.
- Use bounded exponential backoff, retry limits, failure visibility, and a dead-letter or manual-review path as appropriate.
- Make jobs idempotent. A retry must not create duplicate charges, refunds, tickets, ledger entries, or admissions.
- Do not use in-memory timers or process-local queues as the only record of work that must survive a restart.
- Keep operational status visible: pending, retrying, failed, completed, and awaiting manual review.

#### External data and AI

- Confirm that the intended commercial use of TMDB data is permitted before production use. Do not assume that API availability grants the required rights.
- Keep external provider facts separate from Matinee-owned authoritative data.
- AI output must not decide seat availability, payment success, refunds, ticket validity, admission, or other financial/inventory outcomes.
- Keep human review and approval controls for any AI-assisted administrative workflow.
- Do not send personal or sensitive data to external AI services unless the data use is explicitly approved and protected.

### 2.3 Architecture and data-integrity rules

- PostgreSQL is the source of truth for transactional state.
- All application instances must share database-backed state for holds, bookings, payments, idempotency, and jobs.
- Enforce critical invariants with database constraints, indexes, transactions, and conditional updates wherever possible.
- Use application-level validation as an additional layer, not as a substitute for database integrity.
- Use versioned, reviewable SQL migrations. Never use schema push as a production migration strategy.
- Add raw SQL migrations for invariants Prisma cannot express.
- Run migration and invariant tests against PostgreSQL. SQLite passing is not evidence that PostgreSQL constraints, locking, or concurrency behaviour are correct.
- Fail CI/release checks on migration drift or missing required constraints and indexes.
- Keep domain logic out of route handlers, UI components, and provider SDK wrappers.
- Keep provider-specific code behind an adapter boundary. The Matinee domain must not depend directly on Flutterwave SDK response shapes.
- Keep API contracts explicit: authentication, authorization, validation, idempotency, error semantics, and response shape.
- Do not introduce distributed infrastructure unless a documented requirement cannot be met by the existing modular application and durable job design.

## 3. Required implementation workflow

Before changing code:

1. Read this file and the relevant PRD sections.
2. Inspect the existing repository, package scripts, framework versions, conventions, and current implementation. Do not assume the repository matches a proposed architecture.
3. Identify the business invariant and affected state transitions.
4. Check whether the requirement is confirmed, an assumption, a planning target, or a blocker.
5. Identify migration, concurrency, authorization, retry, audit, and rollback implications.
6. If the requirement depends on an unresolved blocker, do not implement a guessed policy. Isolate safe preparatory work and record the decision needed.

While implementing:

1. Make the smallest coherent change that preserves domain boundaries.
2. Validate inputs at the system boundary and enforce authorization on the server.
3. Keep money in integer kobo and derive totals on the server.
4. Use transactions and database constraints for multi-record invariants.
5. Make externally triggered and background operations idempotent.
6. Persist durable events/jobs before acknowledging work.
7. Add structured logs and operational visibility without logging secrets or unnecessary personal data.
8. Add or update tests in the same change as the implementation.
9. Update API contracts, migrations, and documentation when behaviour or schema changes.

Before declaring work complete:

1. Run relevant unit, integration, migration, and end-to-end tests.
2. Run formatting, linting, type checking, and build checks supported by the repository.
3. Verify PostgreSQL-specific constraints and concurrency behaviour for affected workflows.
4. Verify failure and retry paths, not only the happy path.
5. Inspect the diff for secrets, accidental data exposure, scope creep, and unrelated changes.
6. State exactly what was run and what remains unverified. Never claim tests passed if they were not run.

## 4. Coding style and quality standards

- Use TypeScript for TypeScript application surfaces. Preserve the repository's configured strictness; do not weaken compiler settings to make a change pass.
- Prefer explicit types at API, database, provider, and domain boundaries. Avoid `any`; if unavoidable, isolate it and explain why.
- Use descriptive names that reflect the domain: `showtimeId`, `holdExpiresAt`, `amountKobo`, `providerReference`. Avoid ambiguous names such as `data`, `info`, or `value` where domain meaning matters.
- Keep functions focused and small enough to reason about. Extract domain operations when they contain meaningful business rules.
- Prefer explicit state transitions and exhaustive handling of domain states over loosely typed status strings.
- Validate untrusted input at boundaries. Do not rely on TypeScript types to validate runtime data.
- Return safe, consistent errors. Do not leak stack traces, secrets, provider credentials, or internal records to clients.
- Avoid hidden side effects. Name operations that charge, refund, reserve, release, confirm, or scan so their effects are obvious.
- Do not swallow errors. Handle, propagate, or record them with enough context for recovery.
- Do not use floating-point arithmetic for currency.
- Do not put business logic in React components, route handlers, or database model hooks when it belongs in a domain/service layer.
- Do not create generic abstractions before there are multiple real use cases.
- Do not add dependencies without checking whether the repository already provides the capability and whether the dependency is maintained and appropriate.
- Keep comments focused on why an invariant or non-obvious decision exists. Do not narrate obvious code.
- Never commit credentials, API keys, private keys, webhook secrets, production data, or local environment files.

## 5. Suggested folder layout and boundaries

First inspect the repository. Treat this as a target organizational guide, not permission to replace an existing working structure wholesale. Preserve the current mobile framework and adapt the layout to the actual codebase.

A suitable modular-monolith layout is:

```text
/
├── AGENTS.md
├── apps/
│   ├── mobile/                 # Existing iOS/Android customer application
│   ├── web/                    # Next.js web and admin surfaces
│   └── server/                 # Existing or explicitly approved API runtime
├── packages/
│   ├── database/               # Prisma schema, migrations, DB client
│   ├── contracts/              # Shared API schemas and contracts
│   └── shared/                 # Small, genuinely cross-platform utilities
├── modules/
│   ├── identity/               # Authentication, users, roles, permissions
│   ├── discovery/              # Movie and cinema discovery, TMDB boundary
│   ├── cinema/                 # Cinemas, halls, seats, showtimes
│   ├── inventory/              # Seat availability, holds, expiry, seat blocks
│   ├── booking/                # Booking lifecycle and booking seats
│   ├── payments/               # Flutterwave adapter, verification, webhooks
│   ├── ledger/                 # Financial entries and reconciliation
│   ├── refunds/                # Refund approval and provider execution
│   ├── settlement/             # Cinema settlement and payout records
│   ├── tickets/                # Ticket issuance, QR, validation, scanning
│   ├── notifications/           # Notification outbox and delivery
│   └── operations/              # Admin workflows, audit, exception queues
├── infrastructure/
│   ├── jobs/                   # Durable job definitions and workers
│   ├── providers/              # External service adapters
│   ├── observability/          # Logging, metrics, tracing
│   └── security/               # Shared security integrations
├── scripts/
├── docs/
└── tests/
    ├── integration/
    ├── concurrency/
    └── e2e/
```

Boundary rules:

- A module owns its domain rules and exposes intentional interfaces.
- Other modules must not reach into another module's private implementation.
- The payments module owns the Flutterwave integration boundary; booking and ledger modules consume normalized domain outcomes, not raw provider payloads.
- The database package owns schema and migration artifacts; domain modules own the meaning of their data.
- Shared packages must remain small. Do not turn `shared` into a dumping ground.
- Keep UI-specific presentation and state in the relevant app. Keep authoritative business decisions on the server.
- If the current repository uses a different but coherent layout, follow it and document the mapping rather than performing a broad reorganization.

## 6. Testing requirements

Test business invariants, not only individual functions.

### Required test categories

- **Unit tests:** pricing calculations, state transitions, authorization rules, expiry decisions, QR validation logic, and provider-event normalization.
- **PostgreSQL integration tests:** constraints, indexes, transactions, conditional updates, migrations, and rollback behaviour.
- **Concurrency tests:** simultaneous overlapping seat holds; multi-seat all-or-nothing acquisition; hold expiry racing with confirmation; duplicate payment events; concurrent ticket scans; duplicate refund/job execution.
- **Contract tests:** API validation and Flutterwave adapter request/response handling using verified provider documentation and sandbox fixtures.
- **Failure tests:** provider timeout, webhook retry, worker crash, database interruption, delayed/out-of-order events, duplicate delivery, and recovery after restart.
- **End-to-end tests:** customer booking journey, cinema administration, ticket retrieval, door scanning, and authorized refund/settlement workflows.
- **Security tests:** role and cinema scoping, IDOR attempts, rate limits, webhook signature failures, sensitive-data exposure, and authorization bypass attempts.

### Minimum acceptance expectations

- Two customers cannot hold the same showtime seat concurrently.
- A multi-seat hold either acquires every requested seat or acquires none.
- An expired hold cannot be confirmed by relying on a stale client countdown.
- A duplicate or retried provider event cannot create duplicate financial effects.
- A provider-confirmed payment is either reflected in a consistent booking/ledger state or visible in a durable recovery/manual-review queue.
- A ticket cannot be admitted twice, including under simultaneous scan attempts.
- Unauthorized users cannot access or mutate another cinema's records.
- Migrations create and preserve the required PostgreSQL constraints.
- Failed jobs remain observable and recoverable.

Do not use SQLite-only tests to claim PostgreSQL concurrency or integrity guarantees.

## 7. Security, privacy, and operational rules

- Store secrets in the approved secret-management mechanism and inject them through environment configuration. Never hard-code secrets.
- Use separate credentials and configuration for development, test, staging, and production.
- Restrict access to payment events, personal data, audit records, and support data by role and operational need.
- Minimize personal data collected, logged, retained, and shared.
- Define retention and deletion behaviour only after the PRD's legal/privacy decisions are approved. Preserve records subject to legal, financial, or audit retention obligations.
- Use secure transport and appropriate protection for stored credentials and sensitive data.
- Keep authentication rate limits shared across application instances.
- Use structured logs with correlation IDs for booking, payment, provider event, refund, settlement, and job workflows. Do not log secrets or full sensitive payloads.
- Monitor unresolved payment mismatches, aging jobs, failed notifications, refund status, settlement exceptions, and ticket-scan failures.
- Backups must be restorable. Test restoration; do not treat the existence of a backup job as proof of recoverability.
- Document operational runbooks for payment reconciliation, refund exceptions, showtime cancellation, cinema settlement, and ticket validation outages.
- Keep manual operational actions permissioned and audited.

## 8. MVP scope discipline

Do not implement the following as MVP features unless the PRD is explicitly amended and approved:

- Food and drink ordering.
- Promo codes, gift cards, loyalty, reviews, and social features.
- Ticket resale or transfer.
- Customer-facing web booking.
- Languages other than English.
- A virtual waiting room.
- WebSocket-based live seat updates; polling or refresh is sufficient for MVP.
- Customer-initiated cancellation after payment unless the approved refund policy explicitly enables it.
- Films outside TMDB unless a separately approved manual-film workflow is added.
- Currencies other than NGN.
- AI decisions about seat availability, payment success, refunds, ticket validity, or admission.
- Separate queueing infrastructure or microservices solely for complexity's sake.

Do not mistake a roadmap item, planning target, or future feature for MVP authorization.

## 9. Blockers and decisions that must not be guessed

The PRD identifies decisions that require owners and evidence. Keep them visible in a decision register. Do not invent answers or silently ship defaults for:

- Booking-fee amount and economics.
- Tax treatment and the financial definitions needed for checkout and settlement.
- Refund policy, including customer-initiated cancellation eligibility and partial-refund rules.
- Flutterwave integration requirements, supported capabilities, sandbox coverage, and the exact verification/webhook behaviour to rely on.
- Payment-success-versus-expired-hold or unavailable-seat race policy.
- Cinema payout and settlement formulas, timing, reserves, and approval responsibilities.
- Privacy/legal requirements, retention schedule, and legal holds.
- TMDB commercial-use permission.
- Cinema walk-up sales/inventory operating process.
- Safe door-scanning fallback during network interruption.
- External email, push, hosting, and other vendor choices where the PRD does not decide them.
- Any backend runtime or deployment choice not already established by the repository or an approved decision.

For every open decision, record the question, accountable owner, due date, validation method, status, and evidence required to close it. A blocker must be resolved before the affected implementation or release gate.

## 10. Release gates and implementation sequence

Follow the PRD's staged roadmap. Do not skip a gate because a screen or happy-path demo works.

### Phase 0 — Close blockers and establish evidence

- Resolve the P0 product, finance, legal, provider, and operational decisions that block affected work.
- Verify Flutterwave's relevant capabilities and sandbox behaviour before approving the integration.
- Confirm TMDB commercial-use permission.
- Define inventory, payment, refund, and settlement policies.
- Establish the PostgreSQL schema/migration approach and operational evidence.

### Phase 1 — Data integrity and transactional core

- Implement identity and authorization boundaries.
- Implement cinema, hall, seat, and showtime data.
- Implement canonical seat inventory, atomic holds, expiry, and seat blocking.
- Enforce PostgreSQL constraints and test concurrent operations.
- Implement booking state and audit foundations.

### Phase 2 — Durable payment and recovery

- Integrate Flutterwave behind a provider adapter.
- Implement payment initiation, trusted verification, durable webhook intake, idempotency, and recovery.
- Coordinate booking confirmation and financial ledger effects.
- Implement reconciliation and manual-review queues.
- Implement approved refund workflows.

### Phase 3 — Product workflows and operational readiness

- Complete customer discovery and booking workflows.
- Complete cinema admin and platform admin workflows.
- Implement ticket issuance, QR validation, and door scanning.
- Implement durable notifications and operational dashboards/runbooks.
- Verify security, privacy, backup, and recovery controls.

### Phase 4 — Controlled pilot

- Pilot with approved cinemas and operational procedures.
- Monitor the PRD's defined reliability, latency, payment, inventory, and product metrics.
- Reconcile bookings, payments, refunds, and settlement records.
- Fix release-blocking defects before expanding.

### Phase 5 — Expansion

- Expand cinemas and operational capacity only after pilot evidence supports it.
- Treat later features as separately approved scope.
- Do not weaken MVP integrity controls to accelerate expansion.

## 11. Definition of done

A task is not done merely because the UI appears to work. A change is complete only when all applicable items below are satisfied:

- [ ] It implements an approved PRD requirement or explicitly approved decision.
- [ ] It preserves the single authoritative source of truth for affected data.
- [ ] Server-side validation and authorization are present.
- [ ] Database constraints and migrations enforce applicable invariants.
- [ ] Money uses integer kobo and server-calculated amounts.
- [ ] State transitions are explicit and invalid transitions are rejected.
- [ ] Retries and duplicate events are safe and idempotent.
- [ ] Durable work is persisted and recoverable.
- [ ] Audit and operational visibility are adequate for sensitive workflows.
- [ ] Unit and integration tests cover the behaviour.
- [ ] Concurrency and failure tests cover relevant race conditions.
- [ ] PostgreSQL migration/invariant tests pass where applicable.
- [ ] Formatting, linting, type checks, and build checks pass.
- [ ] Documentation and API contracts are updated.
- [ ] No unapproved MVP scope or provider substitution was introduced.
- [ ] The implementation report states what was tested and what remains unresolved.

## 12. When unsure

**Stop and verify. Do not guess.**

1. Search the PRD and repository for the existing requirement, decision, implementation, or convention.
2. Classify the information as a confirmed requirement, approved decision, planning assumption, target, or unresolved blocker.
3. If it is not settled, document the exact question and the person/team that must decide it.
4. Ask for clarification before implementing behaviour that affects money, seat inventory, payments, refunds, settlement, privacy, permissions, or admission.
5. If safe preparatory work is possible without choosing the policy, isolate that work and state the assumption boundary.
6. Prefer the smallest reversible change. Do not introduce a new framework, provider, service, dependency, or architectural pattern without approval.
7. Never silently expand scope, weaken an invariant, discard an event, erase financial history, or claim an unverified guarantee.

When reporting uncertainty, be specific: state what is known, what is not specified, why it matters, and what decision or evidence is needed.

---

## PRD traceability

Use these PRD sections as the primary references when implementing or reviewing the corresponding rules:

| Concern | PRD sections |
|---|---|
| Product direction and core invariant | §1 |
| MVP goals and non-goals | §3 |
| Roles and functional workflows | §§4–5 |
| AI limits | §6 |
| Architecture, API contracts, concurrency, migrations, integrations, security, jobs, operations | §7 |
| Financial definitions, ledger, and settlement | §8 |
| Risks and mitigations | §9 |
| Data model, constraints, retention, invariant audit | §10 |
| Metrics and event definitions | §11 |
| Confirmed direction, assumptions, external facts, decisions | §12 |
| Phases and release gates | §13 |
| Open questions and launch blockers | §14 |
| Build-ready acceptance checklist | §15 |
| Severity-ranked defect closure order | §16 |
| Final implementation rule | §17 |

If this file and the current approved PRD appear to conflict, do not silently choose one. Stop, identify the conflict, and obtain an explicit decision. The PRD remains the product requirements source of truth; this file is the engineering instruction layer.
