# Matinee Product Requirements Document (PRD) --- v2

**Status:** Revised draft --- implementation approval is conditional on
the release gates in this document\
**Product:** Matinee\
**Market:** Nigeria, Lagos first\
**Currency:** NGN; all persisted monetary values are integer minor units
(kobo)\
**Platforms:** iOS and Android customer app; admin experiences as
specified in the original scope\
**Technology direction:** Next.js / TypeScript for supported web and
admin surfaces, Prisma, PostgreSQL, and the existing mobile stack\
**Supersedes:** Matinee PRD v1\
**Purpose of this revision:** Incorporate the reliability,
data-integrity, payments, settlement, operations, metrics, and
release-gate corrections identified in the PRD review.

> **Decision discipline:** This PRD distinguishes product requirements
> from planning assumptions and unresolved external decisions. A
> requirement marked **BLOCKER** must be resolved before the affected
> implementation or release gate. Values described as planning targets
> are not evidence of existing performance. Do not treat a proposed
> schema or API as implemented until migrations and tests prove it.

------------------------------------------------------------------------

## 1. Product summary

Matinee is a mobile app for discovering movies, selecting a cinema and
showtime, choosing specific seats on an interactive seat map, and paying
for tickets. Movie details are sourced from TMDB, subject to
confirmation that the intended commercial use is permitted. Cinemas,
halls, showtimes, seat inventory, holds, bookings, payments, tickets,
refunds, and settlement records are managed in Matinee's own
PostgreSQL-backed system.

Cinema Admins manage their cinemas, halls, seats, and showtimes. Door
Staff validate tickets at the entrance. Platform Admins onboard cinemas,
resolve payment exceptions, administer refunds, and manage settlement
operations.

The primary product invariant is: **a physical seat for a specific
showtime can be allocated to no more than one live hold or confirmed
booking at a time, and a confirmed paid booking must be recoverable and
auditable even when providers, workers, or application instances fail.**

The initial market is Lagos, Nigeria. Prices are displayed in NGN and
persisted as integer kobo. Customers pay a booking fee per ticket only
after the fee, tax treatment, payment-provider charges, refund policy,
and cinema settlement economics are approved (see Sections 8 and 14).

## 2. Problem statement

  -----------------------------------------------------------------------
  Role                    Current pain            Matinee outcome
  ----------------------- ----------------------- -----------------------
  Customer                Showtimes are           Discover a show, choose
                          scattered; seat         exact seats, pay, and
                          availability is         retrieve a valid ticket
                          uncertain; payment may  with clear recovery if
                          succeed without clear   payment status is
                          booking confirmation;   delayed.
                          tickets may not load at 
                          the door.               

  Cinema Admin            Online and walk-up      Manage a single
                          sales can conflict;     authoritative
                          schedule changes are    inventory, block seats
                          difficult to            deliberately, cancel
                          communicate; payouts    showtimes through a
                          are hard to reconcile.  controlled workflow,
                                                  and review auditable
                                                  settlement reports.

  Door Staff              Screenshots can be      Validate a ticket
                          reused; queues are      against
                          slow; ticket validity   server-authoritative
                          may be unclear.         ticket state and reject
                                                  repeat scans.

  Platform Admin          Bookings, provider      Work from durable event
                          payments, refunds, and  records, reconciliation
                          cinema payouts can      queues, auditable
                          disagree.               refund operations, and
                                                  immutable settlement
                                                  history.
  -----------------------------------------------------------------------

No market statistics are asserted here. Any scale or conversion figures
in this document are product targets or planning assumptions until
validated.

## 3. Goals and non-goals

### 3.1 Goals

The following are proposed targets and must be validated in load tests,
pilots, and production monitoring. They are not guarantees before
measurement.

  --------------------------------------------------------------------------
  ID                Goal              Target / acceptance  Measurement
                                      condition            window
  ----------------- ----------------- -------------------- -----------------
  G1                Prevent double    **Zero** overlapping Every integrity
                    booking           confirmed            test and
                                      allocations for the  production audit
                                      same showtime seat;  
                                      hard release gate.   

  G2                Keep seat holds   p95 hold endpoint    Pre-release load
                    responsive        latency under 500 ms test
                                      at 200 hold          
                                      attempts/second on   
                                      one showtime, under  
                                      the documented test  
                                      environment.         

  G3                Keep seat map     A seat taken by      Rolling 30 days
                    reasonably fresh  another customer     
                                      appears unavailable  
                                      within 5 seconds in  
                                      99% of measured      
                                      cases.               

  G4                Confirm           95% of               Rolling 30 days
                    successful        provider-confirmed   
                    payments promptly successful payments  
                                      reach a consistent   
                                      confirmed booking    
                                      state within 10      
                                      seconds of receiving 
                                      a valid provider     
                                      event.               

  G5                Deliver a usable  60 fps seat-map      Each release
                    mobile experience target on a defined  
                                      mid-range Android    
                                      device; first useful 
                                      screen under 2       
                                      seconds on the       
                                      defined 4G test      
                                      profile.             

  G6                Improve booking   35% of eligible      Rolling 30 days
                    completion        customers who create after month 3
                                      a hold complete      
                                      payment, after month 
                                      3; validate          
                                      denominator and      
                                      exclusions before    
                                      reporting.           

  G7                Support cinema    A trained Cinema     First 10 cinemas
                    self-service      Admin creates a hall 
                                      and publishes a      
                                      first showtime in    
                                      under 30 minutes in  
                                      usability testing.   

  G8                Handle showtime   All affected paid    Every
                    cancellation      bookings enter a     cancellation
                    reliably          durable refund       
                                      workflow within 15   
                                      minutes of an        
                                      authorized           
                                      cancellation;        
                                      provider completion  
                                      is tracked           
                                      separately.          

  G9                Maintain app      99.5% crash-free     Rolling 30 days
                    stability         sessions.            

  G10               Recover from      No payment event is  Continuous
                    payment ambiguity silently discarded;  
                                      every unresolved     
                                      provider/booking     
                                      mismatch is visible  
                                      in a retry or        
                                      manual-review queue. 
  --------------------------------------------------------------------------

### 3.2 Non-goals for MVP

-   Food and drink ordering.
-   Promo codes, gift cards, loyalty, reviews, and social features.
-   Ticket resale or transfer.
-   Customer-facing web booking.
-   Languages other than English.
-   A virtual waiting room.
-   WebSocket-based live seat updates; polling or refresh behaviour is
    sufficient for MVP.
-   User-initiated cancellation after payment, unless the approved
    refund policy explicitly enables it.
-   Films not available through TMDB, unless a separately approved
    manual-film workflow is added.
-   Currencies other than NGN.
-   AI deciding seat availability, payment success, refunds, ticket
    validity, or admission.
-   A separate queueing platform or microservice architecture solely for
    complexity's sake. Durable database-backed jobs are acceptable for
    MVP if they meet the guarantees in this PRD.

## 4. User personas

Names are fictional examples.

### 4.1 Customer --- Ife, 27

Uses an Android phone on 4G, usually books two seats after work, needs
clear seat status, payment certainty, and an accessible ticket if
connectivity at the cinema is poor.

### 4.2 Cinema Admin --- Mr. Bello, 45

Manages a cinema from a phone or tablet, publishes schedules, blocks
seats for box-office sales, and needs controlled cancellation and clear
settlement reporting.

### 4.3 Door Staff --- Chidi, 23

Scans tickets at entry and needs a fast, server-authoritative valid/used
result with safe retry behaviour if a scan response is interrupted.

### 4.4 Platform Admin --- Amaka, 31

Onboards cinemas, investigates provider/booking mismatches, approves and
tracks refunds, manages settlements, and needs a complete audit trail.

## 5. Functional requirements

Role codes: **C** = Customer, **CA** = Cinema Admin, **DS** = Door
Staff, **PA** = Platform Admin, **SYS** = system/background worker.
Cinema-scoped roles must be authorized against the relevant cinema on
every request; a client-supplied cinema ID is not proof of access.
Prices and totals are integer kobo.

### 5.1 Accounts and access

-   Users register with name, email, and password of at least 10
    characters, then verify email using a six-digit code valid for 10
    minutes. A user cannot hold seats until verified. The sixth wrong
    attempt invalidates that code.
-   Access tokens expire after 15 minutes. Refresh tokens last 30 days,
    rotate on use, and are stored hashed. Reuse of a rotated refresh
    token revokes the affected session family. These timings are initial
    product assumptions and should be confirmed in security review.
-   Password reset revokes all refresh tokens for the user.
-   Users can sign out of all devices, revoking all refresh tokens.
-   Account deletion is soft deletion followed by anonymization only
    after retention and legal/financial obligations are satisfied. It is
    blocked while the user has an upcoming confirmed booking. **The
    original 30-day anonymization assumption is not automatic:** the
    retention schedule must be approved and must preserve legally
    required financial/audit records without retaining unnecessary
    personal data.
-   Push permission is requested contextually, not on first launch.
-   Platform Admin creates cinemas and their first Cinema Admin. Cinema
    Admin adds Door Staff from existing accounts. A user may have roles
    at multiple cinemas through an explicit cinema-membership record.
-   Authentication rate limits must work across all application
    instances. Per-process in-memory limits alone are insufficient.
    Initial limits of five attempts per minute per IP and email are
    provisional and require abuse/security review.
-   Admin access requires least privilege, explicit role checks, cinema
    scoping, audit records for privileged changes, and stronger
    authentication for sensitive operations.

### 5.2 Discovery

-   Customers browse movies, movie details, cinemas, showtimes, and
    prices.
-   TMDB data is cached with a documented refresh policy and attribution
    where required. **Commercial-use and display permissions are a
    pre-launch blocker**; if permission is not confirmed, disable the
    affected integration or use a legally approved alternative.
-   The app must distinguish no results, loading, stale data, and
    provider failure.
-   A showtime is bookable only if it is published, has not passed the
    configured booking cutoff, belongs to an active cinema/hall, and its
    inventory has been initialized and validated.

### 5.3 Cinemas, halls, seats, and showtimes

-   A cinema contains halls; a hall has a stable seat layout and stable
    seat identifiers.
-   A showtime references one movie, one hall, a start/end time, booking
    status, and a snapshot of the inventory/price policy needed for that
    performance.
-   Showtime creation validates time-zone handling, duration, hall
    ownership, and conflicting showtimes. The product must define
    whether overlap is rejected strictly or allowed with an explicit
    operational override. The default is to reject overlapping use of
    the same hall.
-   Once sales have started, changing a hall's seat layout must not
    silently change inventory for existing showtimes. Layout changes
    create a new version or require a controlled migration.
-   Cinema Admins can publish, unpublish, cancel, or adjust showtimes
    only through audited state transitions.
-   Cinema Admins can block/unblock seats for box-office or operational
    reasons. A block must atomically conflict with active holds and
    confirmed bookings; it cannot silently override a paid booking.
-   **Cross-channel sales:** until POS/ticketing integration exists, the
    cinema must follow a documented operational process so every walk-up
    sale is represented by a Matinee seat block or booking before the
    seat is sold. The cinema owner is accountable for this process. This
    limitation must be disclosed during onboarding.

### 5.4 Seat map and inventory

-   Each seat has a stable identity within its hall; each showtime has a
    unique inventory row for each sellable seat.
-   Seat availability displayed to a client is advisory. The server and
    PostgreSQL transaction are authoritative.
-   Inventory state must be derived from one explicit, documented state
    machine. Do not maintain two competing expiry timestamps or
    independent sources of truth.
-   The authoritative hold expiry is `Hold.expiresAt` (UTC timestamp).
    Any denormalized expiry value, if retained for query performance, is
    a rebuildable cache and must never independently decide whether a
    seat is held.
-   The seat map shows available, held by current user, unavailable/held
    by another user, sold/confirmed, and blocked states with accessible
    labels. It must not expose another customer's identity or booking
    details.
-   A seat can never be allocated to two active holds or two confirmed
    bookings for the same showtime. Database constraints and transaction
    logic enforce this, not only application checks.

### 5.5 Hold and checkout

-   A customer selects one or more seats and requests a hold with a
    stable idempotency key.
-   A hold is all-or-nothing: either every requested seat is held for
    that customer or none is.
-   The hold operation validates showtime status, booking cutoff, seat
    membership, current inventory state, and maximum seat count, then
    performs a conditional atomic database update in a transaction.
-   If any requested seat is unavailable, the transaction does not leave
    partial holds. The response identifies that the request failed
    without disclosing other customers' information.
-   Hold duration is a single configured policy, initially 5 minutes
    unless product approval changes it. The server writes one
    `expiresAt` timestamp and returns it to the client. The UI countdown
    is informational.
-   An expired hold is no longer valid even if a cleanup worker has not
    yet run. Every operation that attempts to consume or release a hold
    checks the authoritative expiry in the transaction.
-   A worker releases expired holds for hygiene and prompt seat-map
    updates. Worker timing must not be the correctness mechanism.
-   Checkout creates a booking attempt and payment attempt using
    idempotency keys. Repeated client submissions return the original
    logical result rather than creating a second booking or charge.
-   The user receives a clear pending state if payment status is
    ambiguous. Do not tell the user payment failed solely because the
    app timed out.
-   If the hold expires before the payment is authoritatively
    successful, the system must apply the approved race policy and never
    oversell. If a provider later reports a successful charge after the
    seat has been released or sold, create a durable exception and
    initiate the approved compensation/refund workflow; never
    force-confirm a conflicting booking.

### 5.6 Payments, provider events, refunds, and reconciliation

-   Use a payment provider approved for the market and supported
    methods. Provider capabilities, signature verification, event retry
    behaviour, idempotency, refund semantics, settlement timing, and
    sandbox coverage must be verified before integration approval.
-   The server initiates payment using a unique internal payment
    reference and the provider's idempotency mechanism where supported.
    Never trust client-supplied payment status or amount.
-   A provider webhook is verified and persisted as a durable
    `PaymentEvent` before the endpoint acknowledges receipt. Invalid
    signatures are rejected. Duplicate events are recognized by provider
    event ID or a stable deduplication key.
-   Persisting the event and processing its business effects are
    separate stages. If the event is stored but processing fails, a
    retryable worker resumes it. A webhook must not be acknowledged and
    then silently lost because in-process processing failed.
-   Event processing is idempotent. A repeated or out-of-order event
    cannot create duplicate bookings, duplicate tickets, duplicate
    refunds, or duplicate settlement entries.
-   State transitions validate provider reference, amount, currency,
    payment state, booking state, and event order. A late success event
    is handled by the recovery policy, not by blindly confirming a
    booking.
-   Payment state and booking state are related but not identical. The
    system must support `PENDING`, `SUCCEEDED`, `FAILED`,
    `CANCELLED`/`EXPIRED` where applicable, and an explicit
    exception/review path for inconsistent outcomes. Exact enum names
    may vary, but the transitions and recovery semantics must be
    documented and tested.
-   A successful payment and booking confirmation must be coordinated
    with seat allocation in a transaction. External provider calls must
    not be made while holding long-running database locks.
-   Refunds are initiated through an auditable operation with a unique
    idempotency key, a reason, actor, amount, currency, and provider
    reference. Duplicate requests return the existing refund operation.
    Partial and full refunds must be represented accurately.
-   A refund is not marked completed merely because the request was
    sent. Track requested, submitted, succeeded, failed, and
    needs-review outcomes as appropriate to the provider. Retry only
    when provider semantics make retry safe.
-   A cancelled showtime creates refund work for each eligible paid
    booking durably and idempotently. Refund jobs can be retried, and
    failed jobs are visible to an operator.
-   Reconciliation compares Matinee payments/refunds with provider
    transactions and settlement reports. Mismatches create actionable
    cases with ownership, age, status, and resolution history. Automated
    reconciliation must not silently overwrite a conflicting ledger.
-   Provider event payloads must be minimized, access-controlled, and
    retained according to the approved retention policy.

### 5.7 Tickets and door scanning

-   Each confirmed seat produces one unique ticket/QR token, bound to
    the booking seat, showtime, and ticket state.
-   QR content must be signed or opaque and must not expose personal
    information or predictable booking IDs.
-   Scanning calls a server-authoritative validation endpoint. A
    successful admission changes the ticket from valid to used
    atomically and records the scanner, cinema, timestamp, and result.
-   Duplicate scans return a clear already-used response. Retries after
    network interruption must not admit the same ticket twice.
-   If offline scanning is not supported for MVP, show an explicit
    connectivity error and provide a documented operational fallback. Do
    not imply that a screenshot alone proves validity. If offline mode
    is later approved, it requires a separate threat model and conflict
    policy.
-   Ticket state and booking/refund/cancellation state must be checked
    together so refunded or cancelled tickets cannot be admitted.

### 5.8 Notifications

-   Booking, payment, ticket, cancellation, and refund notifications are
    delivered through a durable outbox or equivalent transactional
    delivery record.
-   The business transaction writes the notification intent in the same
    database transaction as the state change. A worker sends it and
    records attempts, outcome, and next retry time.
-   Notification failure does not roll back a successful
    booking/payment. The user can still retrieve ticket and booking
    status in-app.
-   Delivery is at-least-once; notifications must tolerate duplicate
    sends. Never rely on an in-process fire-and-forget call as the only
    record that a notification is owed.
-   Define templates, localization policy, provider failure handling,
    retry limits, and dead-letter/manual-review behaviour before
    production.

### 5.9 Cinema Admin and Platform Admin tools

-   Cinema Admins manage only cinemas for which they have an active
    role.
-   Door Staff can scan tickets for their assigned cinema but cannot
    change prices, issue refunds, or manage users.
-   Platform Admins can onboard cinemas, review reconciliation cases,
    approve refunds under policy, and create/approve settlement runs
    according to role separation.
-   Sensitive actions require a reason and create an append-only audit
    record containing actor, action, entity, timestamp,
    request/correlation ID, and relevant before/after values with
    sensitive fields redacted.
-   Refund approval and settlement preparation/approval should be
    separated where staffing permits. If a small team requires one
    person to perform both, record the exception and require a
    second-person review for material amounts according to a
    finance-approved threshold.
-   Admin screens show pending work, retries, failed provider
    operations, unresolved mismatches, and aging. They must not report a
    failed operation as complete.

### 5.10 State transitions

The following are conceptual states; implementation may use different
enum spellings if the semantics remain identical.

**Showtime seat / inventory** - `AVAILABLE` → `HELD` when a valid atomic
hold succeeds. - `HELD` → `AVAILABLE` when the hold expires or is
explicitly released, provided no successful confirmation has consumed
it. - `HELD` → `SOLD`/`CONFIRMED` only when the booking and payment
rules authorize confirmation. - `AVAILABLE` → `BLOCKED` for an
authorized operational block. - `BLOCKED` → `AVAILABLE` only when
unblocking is authorized and no booking/hold conflicts exist. - A seat
with a confirmed booking cannot be freed by hold cleanup, cancellation
races, or a stale worker. A cancellation/refund workflow changes ticket
and booking states under explicit policy; historical records remain.

**Hold** - `ACTIVE` → `CONSUMED` on successful booking confirmation. -
`ACTIVE` → `RELEASED` on customer cancellation, authorized release, or
cleanup after expiry. - `ACTIVE` is valid only while `now < expiresAt`;
expiration is logically effective at the timestamp even if the row is
not yet updated. - Hold state changes are idempotent and conditional on
the expected prior state.

**Booking** - `PENDING_PAYMENT` → `CONFIRMED` only after authoritative
payment success and atomic seat-allocation validation. -
`PENDING_PAYMENT` → `EXPIRED`/`CANCELLED` according to timeout and
provider outcome. - `CONFIRMED` → `CANCELLED` only through an authorized
cancellation flow, with ticket invalidation and refund work created
durably when applicable. - Conflicting or ambiguous provider outcomes
enter a recoverable exception state; they are not silently forced into a
terminal state. - Never delete a booking to repair a payment mismatch.
Preserve history and correct it through auditable state transitions.

**Payment** - Payment state transitions are driven by validated provider
responses/events and idempotent server operations. - Late, duplicate,
contradictory, or out-of-order events are stored and assessed; they must
not regress a final state without a defined provider-specific rule. -
`SUCCEEDED` means the provider confirms the charge; it does not alone
prove a booking was safely confirmed. The booking/inventory consistency
rule still applies.

**Refund** - `REQUESTED` → `SUBMITTED` → `SUCCEEDED` or
`FAILED`/`NEEDS_REVIEW`, based on provider evidence. - Repeated requests
with the same idempotency key resolve to the same refund. - A refund
success event must be deduplicated and reflected in the ledger exactly
once.

**Ticket** - `VALID` → `USED` through an atomic scan. - `VALID` → `VOID`
when booking is cancelled/refunded according to policy. - A `USED`
ticket cannot become `VALID` through a retry or stale request.

### 5.11 Required edge cases

The system must explicitly handle: - Two customers attempting to hold
the same seat simultaneously. - A multi-seat request where only one seat
is unavailable. - Hold expiry racing with checkout or payment
confirmation. - Customer double-tapping pay, retrying after timeout, or
reinstalling the app. - Provider charge success while the client sees a
timeout. - Duplicate, delayed, missing, invalid-signature, or
out-of-order provider events. - Worker crash after persisting an event
but before applying business effects. - Worker crash after provider
refund submission but before storing the response. - Two workers
processing the same event/job. - Cancellation racing with payment
success or ticket scan. - Cinema Admin blocking a seat with an active
hold or booking. - Provider refund failure or partial refund. - Cinema
settlement already generated when a late refund or chargeback appears. -
Duplicate QR scan or scan response timeout. - Notification provider
outage. - Database failover, deploy interruption, job lease expiry, and
retry. - A walk-up sale not reflected in Matinee inventory. - A user
deletion request while financial or legal retention obligations remain.

## 6. AI processing pipeline

AI is not in scope for determining seat availability, inventory
ownership, booking confirmation, payment state, refunds, ticket
validity, admission, or settlement amounts. These are deterministic
server/database workflows.

AI may be considered later for non-authoritative assistance such as
support-agent summaries, but only after privacy, data handling, and
human-review controls are approved. AI output must never override the
authoritative state machine or trigger a financial action without an
explicit deterministic policy and authorized human/system workflow.

## 7. Technical requirements

### 7.1 Architecture and tools

-   PostgreSQL is the authoritative production database.
-   Prisma is the application data-access layer, supplemented by
    reviewed SQL migrations for partial unique indexes, exclusion
    constraints, check constraints, locking or other invariants Prisma
    cannot express.
-   SQLite may be used for local development or isolated unit tests
    only. It is not an acceptable substitute for PostgreSQL concurrency
    tests or production acceptance.
-   Keep a modular application architecture. A separate queue service,
    WebSockets, or microservices are not MVP requirements unless load
    tests or operational evidence demonstrate the need.
-   All application instances must share database-backed state for
    inventory, idempotency, rate limits, durable jobs, and event
    processing. In-memory state may be a cache, never the correctness
    source.
-   Store timestamps in UTC and define the cinema display time zone
    explicitly. Handle daylight-saving and locale formatting defensively
    even if the initial market has no expected DST transitions.

### 7.2 API contracts

All APIs must define authentication, authorization, request validation,
response shape, error codes, idempotency behaviour, and retry semantics.
Public APIs must not reveal sensitive inventory, payment, or user data.

Minimum contracts to document before implementation: - Create/release
hold. - Fetch showtime seat map. - Create payment attempt. - Retrieve
booking/payment status. - Receive provider webhook. - Process refund /
retrieve refund status. - Cancel showtime and create affected refund
work. - Scan/validate ticket. - Block/unblock seats. -
Publish/update/cancel showtime. - Create/review settlement run. - Read
reconciliation queue and resolve a case.

For mutating endpoints, use idempotency keys where client retries or
provider ambiguity could repeat an action. Store key scope, request
fingerprint, response/result reference, status, and retention policy.
Reusing a key with a different request payload must be rejected.
Document which errors are retryable.

### 7.3 Concurrency and integrity contract

#### 7.3.1 Canonical inventory model

There is exactly one authoritative logical state for each
`(showtimeId, seatId)` inventory item. A `ShowtimeSeat` row is the
inventory identity for a seat at a specific showtime. It records the
current inventory state and, when held, the owning hold and its
authoritative expiry reference. Booking history is represented
separately and is not erased when inventory changes.

The `Hold.expiresAt` timestamp is the single authoritative expiry. If a
duplicate timestamp is retained on `ShowtimeSeat` for query performance,
it is denormalized, must be updated atomically, and must be
auditable/rebuildable from the hold. Application decisions must not use
conflicting expiry values.

#### 7.3.2 All-or-nothing hold of N seats

1.  Validate user, verified account, showtime eligibility, requested
    seat IDs, and maximum seat count.
2.  Begin a PostgreSQL transaction.
3.  Lock or conditionally update the requested inventory rows in a
    deterministic order to reduce deadlocks.
4.  Re-check availability and expiry using database-authoritative state
    inside the transaction.
5.  If any requested seat cannot be acquired, roll back all changes and
    return a conflict response.
6.  If all can be acquired, create the hold, associate each seat with
    it, and write the idempotency result in the same transaction.
7.  Commit and return the hold ID and `expiresAt`.
8.  On deadlock/serialization conflict, retry a bounded number of times
    using the same logical idempotency key; otherwise return a retryable
    error.

The implementation must prove all-or-nothing behaviour under concurrent
load. A preflight read outside the transaction is not sufficient.

#### 7.3.3 Confirmation and seat integrity

-   Booking confirmation is an atomic database operation that verifies
    payment evidence, current hold ownership, hold expiry/race policy,
    showtime state, and all seats in the hold.
-   Enforce unique inventory identity `(showtimeId, seatId)`.
-   Enforce that a seat cannot have multiple active hold owners and
    cannot have multiple live confirmed booking-seat allocations for the
    same showtime. Use unique/partial unique indexes, foreign keys,
    transaction logic, or a reviewed combination appropriate to the
    final schema.
-   Every `BookingSeat` must reference a seat belonging to the same
    showtime/hall context as its booking. Where a simple foreign key
    cannot enforce the composite relationship, use a composite key or
    reviewed database trigger/constraint. Application validation alone
    is not sufficient for this invariant.
-   A confirmed booking must have exactly the expected number of
    booking-seat rows and corresponding tickets; creation is atomic.
-   Historical bookings, payment events, refunds, audit records, and
    settlement entries are not hard-deleted to resolve conflicts.

#### 7.3.4 Database and migrations

-   PostgreSQL is the acceptance environment for all concurrency,
    uniqueness, locking, and transactional tests.
-   Every schema change is delivered as a versioned migration. The
    checked-in schema, migration history, and production database must
    agree.
-   Raw SQL migrations for invariants Prisma cannot express must be
    reviewed and tested on a clean database and an upgrade from the
    previous release.
-   Release pipelines must fail on migration drift, missing required
    indexes/constraints, or failed migration tests.
-   Include a reproducible schema-invariant audit query/script that
    checks duplicate seat allocations, orphaned rows, inconsistent
    booking/payment states, and ticket-count mismatches. Any detected
    violation blocks release and triggers incident handling in
    production.

#### 7.3.5 Hold expiry and cleanup

-   Logical expiry is enforced at read/transition time by comparing
    current database time with `Hold.expiresAt`.
-   A database-backed worker releases expired holds and updates
    inventory in bounded batches. It must use conditional updates so it
    cannot free a seat whose hold has been consumed or replaced.
-   Job claiming uses leases/locking or equivalent cross-instance
    coordination. Jobs are safe under duplicate execution.
-   Monitor oldest overdue hold, cleanup lag, job retry count, and
    failed cleanup count.
-   The worker improves cleanup and visibility; it is not the only
    mechanism preventing expired holds from being consumed.

#### 7.3.6 Idempotency and provider webhook handling

-   Verify provider signature and relevant timestamp/nonce rules before
    accepting a webhook.
-   Persist the raw/minimized event envelope, provider event ID, payment
    reference, received time, signature-validation outcome, processing
    status, attempt count, and correlation IDs. Restrict and redact
    sensitive payload access.
-   Enforce unique provider event identity, or a provider-specific
    deduplication key when no event ID exists.
-   Acknowledge a valid event only after durable persistence succeeds.
    If persistence fails, return an error so the provider can retry.
-   Process persisted events asynchronously or through an equally
    durable mechanism. Mark an event processed only after the related
    business transaction commits.
-   Event processor is idempotent; duplicate deliveries produce no
    duplicate side effects.
-   If the worker crashes before commit, the event remains retryable. If
    it crashes after commit but before marking complete, a retry safely
    recognizes the committed result.
-   Unknown event types are recorded and surfaced, not silently
    discarded.
-   Define retry backoff, maximum automatic attempts, alert thresholds,
    and dead-letter/manual-review handling.

#### 7.3.7 Refund and settlement consistency

-   Each refund has a stable internal ID, provider reference when
    available, idempotency key, amount, currency, reason, actor, state,
    and timestamps.
-   A database uniqueness rule prevents the same logical refund
    operation from being created twice. Provider retries follow the
    provider's documented idempotency semantics.
-   Represent money movements as immutable ledger/settlement entries or
    equivalent append-only records. Corrections use reversal/adjustment
    entries, not edits that erase history.
-   A late refund, chargeback, or payment correction after a settlement
    run creates a new adjustment in the next eligible settlement period
    and links it to the original transaction.
-   Settlement runs have explicit states, totals, included source
    records, approval history, and a reconciliation result. A run cannot
    be marked paid merely because a payout request was submitted.
-   Finance must approve formulas for gross ticket value, booking fee,
    tax, provider fee, cinema share, refund allocation, chargeback
    allocation, and rounding before real-money pilot.

#### 7.3.8 Reconciliation

Run scheduled reconciliation between: 1. Matinee payment/refund records,
2. provider transaction/refund reports, and 3. settlement/payout reports
where available.

Each mismatch becomes a durable case with category, amount, currency,
affected booking/payment/refund, first-seen time, owner, retry/manual
action, status, and resolution evidence. Reconciliation must be
repeatable and idempotent. It must not automatically overwrite source
records without an auditable correction event.

#### 7.3.9 Load model and acceptance test

The original planning scenario is 4,000 customers attempting to book 120
seats in one hall over the first minutes of a premiere, with a target of
200 hold attempts/second on one showtime. Before the first pilot,
publish a reproducible report stating: - application and database
instance sizes/configuration; - test data volume and seat
distribution; - request mix, arrival pattern, concurrency, and
duration; - network and client assumptions; - latency percentiles and
error rates by endpoint; - database lock waits, deadlocks, connection
pool saturation, CPU, memory, and query plans; - number of accepted
holds and rejected conflicts; - invariant audit results before and after
the run; - failure injection scenarios and observed recovery.

Pass conditions: - zero duplicate live seat allocations and zero
confirmed double bookings; - multi-seat holds are all-or-nothing; - all
accepted requests have deterministic, auditable outcomes; - no event or
refund operation is silently lost; - target latency is met in the
declared environment or the target is formally revised before release
with evidence and product approval; - no unresolved integrity-audit
violations.

A load report that omits environment, request distribution, error rate,
or integrity audit is not a passing report.

#### 7.3.10 Failure-mode tests

Required scenarios include provider timeout after successful charge,
invalid signature, duplicate and out-of-order webhook, crash after event
persistence, crash after business commit, concurrent workers, DB
failover, job lease expiry, duplicate refund submission, partial refund,
late refund after settlement, hold-expiry/confirmation race,
cancellation/payment race, scan retry, and notification provider outage.

#### 7.3.11 Release pass/fail criteria

A release fails if any of the following is true: - a seat can be
confirmed twice; - an expired hold can be consumed outside the approved
race policy; - a valid webhook can be acknowledged without durable
storage; - a persisted event can become permanently unprocessable
without alert/manual review; - a retry can create a duplicate charge,
refund, ticket, or settlement movement; - a confirmed booking can lack
the expected seat/ticket records; - migrations do not reproduce the
required constraints; - integrity audit reports unresolved violations; -
a P0 blocker remains open.

### 7.4 Database portability and migration

PostgreSQL is the production source of truth. SQLite may support
developer convenience but cannot establish concurrency correctness. CI
must run migration and invariant tests against PostgreSQL. Versioned
migrations are the authoritative history; do not rely on an implicit
schema push in production. Migrations must include
constraints/indexes/triggers that are required for correctness, plus
rollback or forward-repair notes for risky changes.

### 7.5 Integrations

**TMDB:** Verify commercial-use, attribution, caching, image use, and
rate-limit terms before production. Record the approval or disable the
integration until resolved.

**Payment provider:** Verify production eligibility in Nigeria,
supported payment methods, webhook signatures, retry policy, event IDs,
idempotency, refund support, partial refunds, settlement reports,
chargeback flow, sandbox behaviour, and operational contacts. Use
sandbox tests for duplicate, delayed, missing, contradictory, and
out-of-order events.

**Email/push:** Confirm delivery provider, rate limits, template policy,
retry behaviour, and data-processing terms. Delivery uses the durable
outbox.

**Other external dependencies:** Document owner, approval status,
fallback, and release impact in the decision register. Do not claim a
provider capability without a source or a successful test.

### 7.6 Authentication and permissions

-   Every endpoint enforces server-side role checks and resource
    ownership.
-   Cinema-scoped actions verify the actor's active membership for the
    target cinema.
-   Door Staff can scan only for assigned cinema/showtime scope.
-   Platform Admin financial actions are audited and constrained by
    approved policy.
-   Use secure password hashing, short-lived access tokens, rotating
    hashed refresh tokens, CSRF protection where applicable, secure
    secret storage, input validation, output redaction, and dependency
    scanning.
-   Sensitive operations require rate limits and anomaly monitoring
    shared across instances.
-   Never log passwords, refresh tokens, full payment credentials, or
    unredacted sensitive webhook payloads.

### 7.7 Tickets and QR

QR tokens are signed or opaque, high entropy, non-sequential, and do not
contain personal data. Server-side validation and atomic single-use
state are authoritative. Scan requests include an
idempotency/correlation identifier. The server returns valid,
already-used, cancelled/void, wrong-showtime, or unable-to-verify
outcomes. The product must define a safe manual fallback for outages;
offline acceptance is not assumed for MVP.

### 7.8 Mobile UX quality bar

Measure on a documented device set and network profile. Define: - device
model, OS version, app build, and display refresh rate; - 4G
latency/bandwidth profile and test location; - cold-start versus
warm-start definition; - what constitutes the first useful screen; -
frame-rate measurement method and test duration; - accessibility checks
for seat-state labels, contrast, touch targets, and screen readers.

The 60 fps and under-2-second targets remain proposed until reproducible
measurement confirms them. Seat-map refresh must handle stale responses
and never overwrite newer inventory state with an older response.

### 7.9 Background jobs and durable processing

Use a PostgreSQL-backed jobs table or another approved durable queue.
For database-backed jobs, store job type, payload/reference, status,
availability time, lease/lock owner, lease expiry, attempt count, last
error, created/updated timestamps, and correlation ID. Use bounded
leases and conditional claiming so multiple app instances cannot execute
the same non-idempotent action concurrently without coordination.

Jobs must be idempotent. Failed jobs use bounded exponential backoff
with jitter, alerting, and a dead-letter/manual-review state. Required
jobs include hold cleanup, payment-event processing, reconciliation,
refund processing, notification delivery, settlement generation, and
retention/anonymization processing. Job health dashboards include queue
depth, oldest pending age, retry rate, failed count, and lease expiries.

### 7.10 Hosting, environments, logging, backups, security

-   Separate development, test, staging/sandbox, and production
    environments with separate credentials and payment-provider
    configuration.
-   Production secrets are stored in an approved secret manager; no
    secrets in source control or client bundles.
-   Use structured logs with request ID, correlation ID, actor ID where
    appropriate, resource IDs, and redacted provider references.
-   Monitor API errors/latency, DB health, job queues, webhook
    receipt/processing lag, payment/booking mismatches, refunds, scans,
    and settlement discrepancies.
-   Define backup frequency, retention, encryption, access control, and
    restore objectives. Test restoration before pilot and at a
    documented recurring cadence. A backup that has never been restored
    is not a verified recovery plan.
-   Document incident severity, on-call owner, payment/webhook incident
    procedure, duplicate-booking response, provider outage response,
    refund failure response, and data breach response.
-   Define data retention by data class: account/profile, auth/session,
    booking/ticket, payment/refund, webhook event, audit log, analytics,
    and support data. The schedule must identify purpose, retention
    period, legal/financial hold, access, deletion/anonymization method,
    and owner. Do not delete financial/audit evidence merely to satisfy
    a generic account-deletion timer.
-   Complete a security/privacy review before real-money launch.

### 7.11 Performance targets and shared rate limits

The original performance targets are planning targets, not proven
service levels. Publish measured results with environment details. Rate
limits must be enforced in a shared store or database-backed mechanism
so horizontally scaled instances do not each grant a full independent
quota. Configure separate limits for authentication, holds, checkout,
webhooks, ticket scans, admin actions, and notification endpoints.
Provider webhooks must be protected without blocking legitimate provider
retries.

## 8. Business model and financial rules

Matinee's proposed revenue model includes a booking fee per ticket. The
fee is not approved until Finance/Product confirms the customer-facing
price, tax treatment, payment-provider fee allocation, cinema revenue
share, refund treatment, and rounding rules.

### 8.1 Required financial definitions

Before implementation of production payment/settlement flows, approve: -
ticket face value and whether cinema pricing is tax-inclusive; - booking
fee per ticket and whether it is taxable; - which party bears provider
fees; - whether booking fees are refundable when the ticket is refunded
or a showtime is cancelled; - full versus partial refund policy and
rounding; - cinema gross and net settlement formula; - treatment of
chargebacks, failed payouts, provider reversals, and late adjustments; -
payout schedule, minimum payout, approval process, and evidence required
to mark a payout paid.

All calculations use integer kobo. Store the applied fee/tax/commission
values on the booking or financial transaction as a snapshot so later
configuration changes do not rewrite history.

### 8.2 Example revenue calculation

Any numerical example in the earlier PRD is illustrative only and must
not be used for implementation or investor/consumer claims until the fee
and settlement decisions are approved. Finance must publish a worked
example covering one paid ticket, a multi-ticket booking, a full refund,
a partial refund, a provider fee, a showtime cancellation, and a late
refund after settlement.

### 8.3 Financial ledger and settlement

-   Use immutable transaction/ledger entries for charges, refunds, fees,
    cinema payable, payout, reversal, and adjustment.
-   Every entry has currency, integer amount, source event/reference,
    effective time, created time, and audit/correlation reference.
-   Settlement generation is deterministic and repeatable for the same
    source snapshot.
-   A settlement run records included transactions, calculation version,
    totals, status, and approvals.
-   Late financial events after settlement generate linked adjustment
    entries in a later run; they do not mutate a paid settlement's
    historical contents.
-   Reconciliation is required before a settlement is approved. Provider
    payout submission and provider payout success are different states.

## 9. Risks and mitigations

  -------------------------------------------------------------------------------------------------------------------------------
  ID          Risk                             Severity    Mitigation / control       Owner                    Closure evidence
  ----------- -------------------------------- ----------- -------------------------- ------------------------ ------------------
  R1          Duplicate seat allocation under  P0          PostgreSQL constraints,    Engineering              Passing
              concurrency                                  atomic conditional                                  concurrency suite
                                                           transactions, race tests,                           and clean audit
                                                           integrity audit                                     

  R2          Webhook acknowledged but         P0          Persist before             Engineering              Crash/replay tests
              business processing lost                     acknowledgement; durable                            and alerts
                                                           processing state;                                   
                                                           retry/manual review                                 

  R3          Hold expiry represented in       P0          `Hold.expiresAt`           Engineering              Schema review and
              competing sources                            authoritative; derived                              expiry race tests
                                                           fields are rebuildable                              
                                                           only                                                

  R4          Duplicate                        P0          Idempotency keys, provider Engineering/Payments     Replay and
              charges/refunds/tickets/ledger               event dedupe, unique                                duplicate-worker
              movements                                    constraints, immutable                              tests
                                                           ledger                                              

  R5          Booking/payment/refund states    P0          Explicit state machine,    Payments/Engineering     Fault-injection
              disagree without recovery                    reconciliation cases,                               and reconciliation
                                                           operator queue                                      evidence

  R6          Late refund/chargeback changes   P0          Append-only adjustment     Finance/Engineering      Worked ledger
              settled amounts silently                     entries and later                                   examples and tests
                                                           settlement adjustment                               

  R7          Cross-channel walk-up sales      P1          Cinema operating procedure Operations/Cinema        Signed onboarding
              oversell inventory                           and seat blocking; POS                              procedure and
                                                           integration remains out of                          pilot audit
                                                           scope                                               

  R8          Notifications lost after         P1          Transactional outbox,      Engineering              Outbox outage test
              successful booking                           retries, manual review                              

  R9          Multiple instances execute jobs  P1          Shared durable queue,      Engineering              Multi-worker tests
              inconsistently                               leases, idempotent workers                          

  R10         Schema constraints missing from  P1          Versioned migrations,      Engineering              Clean-install and
              production                                   drift detection,                                    upgrade tests
                                                           PostgreSQL CI                                       

  R11         Pricing/refund/settlement        P1          Finance/Product approval   Product/Finance          Signed decision
              economics unclear                            and worked examples                                 record

  R12         TMDB or payment-provider         P1          Verify                     Product/Legal/Payments   Written approval
              terms/capabilities unsuitable                permissions/capabilities                            and sandbox
                                                           before launch                                       evidence

  R13         In-memory rate limits            P1          Shared rate-limit          Engineering/Security     Multi-instance
              ineffective across instances                 mechanism                                           rate-limit test

  R14         Retention/anonymization          P1          Approved data-class        Privacy/Legal/Product    Signed retention
              conflicts with financial records             retention schedule                                  policy

  R15         Metrics have inconsistent        P1          Metric dictionary and      Product/Data             Dashboard
              denominators or goals                        single source of truth                              definitions
                                                                                                               approved

  R16         Load claims cannot be reproduced P1          Versioned load-test report Engineering              Accepted load
                                                           and fixed environment                               report
                                                           description                                         

  R17         Hall/showtime overlap or seat    P1          Scheduling constraints and Engineering/Product      Migration and
              layout changes corrupt inventory             layout versioning                                   schedule conflict
                                                                                                               tests

  R18         Ticket scan retry admits twice   P1          Atomic one-time scan and   Engineering/Operations   Duplicate scan
                                                           idempotent result                                   tests

  R19         Admin privilege misuse is not    P1          Scoped RBAC and            Security/Engineering     Authorization and
              traceable                                    append-only audit                                   audit tests

  R20         Mobile quality target is         P2          Defined devices, network   Mobile Lead              Reproducible
              subjective                                   profile, and measurement                            benchmark
                                                           protocol                                            

  R21         User workflow assumptions are    P2          Observe pilot users and    Product/Operations       Pilot findings and
              unvalidated                                  update requirements from                            decisions
                                                           evidence                                            
  -------------------------------------------------------------------------------------------------------------------------------

**Risk ownership rule:** every open risk must have one named accountable
role/person, a due date, mitigation status, and evidence required to
close it. A risk cannot be marked closed because code was written; its
stated closure evidence must pass.

## 10. Data model requirements

This section specifies required entities and integrity relationships.
Exact Prisma model spelling can vary, but equivalent database
constraints and semantics are mandatory. The checked-in Prisma schema
and SQL migrations must be reviewed together.

### 10.1 Core entities

  -----------------------------------------------------------------------------
  Entity                  Purpose                 Required fields /
                                                  relationships
  ----------------------- ----------------------- -----------------------------
  `User`                  Customer and staff      ID, email (normalized
                          identity                unique), password hash,
                                                  verification/deletion state,
                                                  timestamps

  `Session` /             Rotating sessions       Hashed token, family/session
  `RefreshToken`                                  ID, expiry, revoked/rotated
                                                  state, user FK

  `Cinema`                Cinema tenant           ID, name, location/time zone,
                                                  active state

  `CinemaStaff`           Scoped role membership  User FK, cinema FK, role,
                                                  active state; unique
                                                  user/cinema/role or
                                                  equivalent membership rule

  `Hall`                  Physical auditorium     Cinema FK, name, active
                                                  state, current layout/version

  `Seat`                  Stable physical seat    Hall FK, stable seat
                                                  label/coordinates/type,
                                                  layout version where needed

  `Movie`                 Movie metadata          Provider ID where applicable,
                                                  title, metadata timestamps

  `Showtime`              Scheduled performance   Movie FK, hall FK, start/end,
                                                  state, booking cutoff,
                                                  price/policy snapshot,
                                                  inventory initialization
                                                  state

  `ShowtimeSeat`          Inventory item for one  Showtime FK, seat FK, state,
                          seat at one showtime    optional current hold FK,
                                                  timestamps; unique
                                                  `(showtimeId, seatId)`

  `Hold`                  Temporary seat          User FK, showtime FK, state,
                          allocation              authoritative `expiresAt`,
                                                  idempotency reference,
                                                  timestamps

  `HoldSeat` or           Seats in a hold         Hold FK, ShowtimeSeat FK;
  equivalent                                      unique constraints preventing
                                                  conflicting active allocation

  `Booking`               Customer purchase/order User FK, showtime FK, status,
                                                  totals, currency,
                                                  fee/tax/price snapshots,
                                                  idempotency reference,
                                                  timestamps

  `BookingSeat`           Seats purchased in a    Booking FK, ShowtimeSeat/Seat
                          booking                 FK, immutable price snapshot;
                                                  composite integrity ensures
                                                  same showtime

  `Payment`               Payment attempt/charge  Booking FK, provider,
                          state                   internal reference, provider
                                                  reference, amount/currency,
                                                  status, idempotency key,
                                                  timestamps

  `PaymentEvent`          Durable provider event  Provider event ID/dedupe key
                          inbox                   unique, payment reference,
                                                  validated receipt data,
                                                  processing status, attempts,
                                                  timestamps

  `Refund`                Refund request and      Payment/booking FK, unique
                          outcome                 idempotency key, provider
                                                  reference, amount/currency,
                                                  reason, actor, status,
                                                  timestamps

  `Ticket`                Single-seat admission   BookingSeat FK unique, secure
                          credential              token/hash, state, scan
                                                  metadata

  `TicketScan`            Scan audit and          Ticket FK, scanner/cinema,
                          idempotent response     request key, result,
                                                  timestamp; dedupe rule for
                                                  repeated request

  `NotificationOutbox`    Durable notification    Event/entity reference,
                          intent                  recipient/channel/template,
                                                  status, attempts, next retry,
                                                  sent timestamp

  `Job` / `JobRun`        Durable asynchronous    Job type/reference, status,
                          work                    lease, attempts, next run,
                                                  last error, correlation ID

  `LedgerEntry`           Immutable money         Source type/ID, entry type,
                          movement                signed integer amount,
                                                  currency, effective/created
                                                  timestamps, adjustment link

  `SettlementRun`         Payout calculation and  Cinema, period, calculation
                          approval                version, totals, state,
                                                  approvals, reconciliation
                                                  state

  `SettlementLine`        Transactions included   SettlementRun FK, ledger
                          in settlement           entry/source reference,
                                                  amount/currency

  `ReconciliationCase`    Payment/refund/payout   Category, source references,
                          mismatch                amount/currency, owner,
                                                  status, evidence, resolution
                                                  history

  `IdempotencyKey`        Safe repeat of          Scope, key, request
                          mutations               fingerprint, state, result
                                                  reference, expiry/retention

  `AuditLog`              Privileged/business     Actor, action, entity,
                          audit                   before/after summary, reason,
                                                  request/correlation ID,
                                                  timestamp

  `MetricEvent` or        Consistent funnel and   Event name/version,
  analytics event store   operations metrics      timestamp, pseudonymous
                                                  subject/session, relevant IDs
                                                  and properties
  -----------------------------------------------------------------------------

### 10.2 Required constraints and indexes

The implementation must include, as appropriate to the finalized schema:

-   Unique normalized user email.
-   Unique `(showtimeId, seatId)` on `ShowtimeSeat`.
-   Unique provider event identity or provider-specific deduplication
    key.
-   Unique idempotency key within its declared scope.
-   Unique provider payment/refund references when the provider
    guarantees uniqueness.
-   Unique ticket per booking seat.
-   Unique scan request/idempotency key in the appropriate scope.
-   Database enforcement preventing duplicate active hold allocations
    and duplicate live confirmed booking-seat allocations.
-   Composite foreign-key or trigger protection ensuring a `BookingSeat`
    belongs to the same showtime as its booking.
-   Foreign keys for all required parent relationships; no orphaned
    payment, refund, ticket, or settlement lines.
-   Indexes for hold expiry, showtime inventory, payment/provider
    references, unprocessed events, pending jobs, reconciliation
    status/age, refund state, and settlement period.
-   Check constraints for nonnegative amounts where applicable, valid
    time ordering, supported currency, and legal state/field
    combinations.
-   Append-only protections or application/database controls for ledger,
    provider event history, and audit records.

Partial unique indexes or triggers may be required for invariants Prisma
cannot represent. Include them in versioned SQL migrations and automated
schema tests.

### 10.3 Deletion and retention

Do not cascade-delete bookings, payments, refunds, tickets, ledger
entries, settlement lines, payment events needed for disputes, or audit
records merely because a user or cinema is deactivated. Use soft
deletion, anonymization, restricted access, and retention rules as
appropriate. Retention periods and legal holds must be approved before
launch.

### 10.4 Invariant audit

Provide a repeatable script/query set that checks: - more than one
active hold allocation for a showtime seat; - more than one live
confirmed booking allocation for a showtime seat; - booking seats
referencing the wrong showtime/hall; - confirmed bookings missing
expected booking-seat or ticket rows; - paid provider transactions with
no matching payment/booking or unresolved recovery case; - duplicate
refund or ledger source references; - successful refunds missing ledger
entries; - settlement lines not tied to valid source records; - stale
unprocessed provider events/jobs beyond threshold; - outbox
notifications that have exhausted retries without an operator-visible
case.

Run the audit in CI, before pilot, after major migrations, and on a
recurring production schedule. Any violation is a release blocker and a
production incident until resolved.

## 11. Success metrics and event definitions

Product and operational dashboards must use a versioned metric
dictionary. Every metric definition specifies owner, formula, event
source, denominator, exclusions, time zone, aggregation window, and
alert threshold.

  -----------------------------------------------------------------------
  Metric                  Definition / notes      Owner
  ----------------------- ----------------------- -----------------------
  Double-booking count    Count of confirmed      Engineering
                          inventory conflicts     
                          found by transactional  
                          safeguards or integrity 
                          audit. Target: zero.    

  Hold latency p95        p95 elapsed time from   Engineering
                          server receipt to       
                          completed response for  
                          hold endpoint; report   
                          success and conflict    
                          separately.             

  Hold conflict rate      Conflicting hold        Product/Data
                          attempts divided by     
                          valid hold attempts;    
                          segment by showtime and 
                          traffic source.         

  Hold-to-paid conversion Unique eligible booking Product/Data
                          attempts with a         
                          confirmed payment       
                          divided by eligible     
                          unique holds, using a   
                          fixed attribution       
                          window and documented   
                          expiry/cancellation     
                          exclusions.             

  Payment confirmation    Time from receipt of    Payments
  latency                 valid provider success  
                          event to consistent     
                          confirmed booking       
                          state; also report      
                          provider-to-webhook     
                          delay separately where  
                          available.              

  Unresolved payment      Count and total value   Payments/Finance
  mismatch                of unmatched            
                          provider/Matinee        
                          payment states,         
                          segmented by age.       

  Refund processing time  Time from authorized    Payments
                          refund request to       
                          provider-confirmed      
                          refund; separately      
                          report time to          
                          submission and time to  
                          completion.             

  Refund failure rate     Failed/needs-review     Payments
                          refunds divided by      
                          submitted refunds, with 
                          reason categories.      

  Settlement discrepancy  Absolute and net        Finance
                          difference between      
                          expected ledger totals  
                          and provider/payout     
                          reports.                

  Notification delivery   Successful provider     Engineering
                          acceptance/delivery     
                          where observable, retry 
                          count, and oldest       
                          pending outbox age.     

  Ticket scan success     Valid scans completed   Operations
                          within target latency;  
                          report already-used and 
                          connectivity errors     
                          separately.             

  Crash-free sessions     Sessions without an app Mobile
                          crash divided by        
                          eligible sessions, by   
                          platform/app version.   

  Seat-map freshness      Time between a seat     Mobile/Engineering
                          becoming unavailable on 
                          the server and clients  
                          displaying it as        
                          unavailable, under the  
                          documented measurement  
                          method.                 

  Cinema setup time       Observed time for a     Product/Operations
                          trained admin to create 
                          a hall and publish      
                          first showtime, with    
                          task success recorded.  
  -----------------------------------------------------------------------

Do not report a target as met unless the data source and denominator are
validated. Metrics must not conflict between the goals table, dashboard,
release checklist, and roadmap. If a target changes, record the old
target, new target, rationale, approver, and effective date.

## 12. Assumptions and decision register

### 12.1 Confirmed product direction

-   Nigeria launch, Lagos first.
-   NGN pricing with integer kobo persistence.
-   Mobile-first customer experience.
-   Matinee owns showtimes, inventory, bookings, ticket state, and
    settlement records.
-   No double booking is a hard invariant.
-   AI is not authoritative for financial or inventory decisions.
-   MVP does not require a waiting room, WebSockets, POS integration, or
    customer web booking.

### 12.2 Planning assumptions requiring validation

-   Hold duration: initially five minutes.
-   Target load: 200 hold attempts/second on one showtime.
-   Premiere scenario: 4,000 attempted customers for 120 seats.
-   Performance and conversion targets in Section 3.
-   Authentication rate limits and token durations.
-   Account anonymization timing and data-retention schedule.
-   The manual cross-channel sales process is sufficient for the first
    pilot.
-   A PostgreSQL-backed jobs table meets operational needs for MVP.

Each assumption must have an owner, due date, validation method, status,
and consequence if invalidated. Assumptions affecting money, privacy,
provider behaviour, or inventory correctness must be resolved before the
relevant release gate.

### 12.3 External facts requiring evidence

-   TMDB commercial-use rights and display/attribution terms.
-   Payment provider availability, supported payment methods, webhook
    semantics, refund/partial refund support, idempotency, chargeback
    handling, and settlement reports.
-   Applicable privacy, financial-record retention, tax, consumer
    refund, and payout obligations.
-   App-store approval requirements and provider production approval.

External facts must be backed by a written approval, official
documentation, or a successful documented provider test. Do not mark
them confirmed based only on a verbal assumption.

### 12.4 Decision register

Maintain a live register with columns: **ID, decision/question,
category, accountable owner, due date, status, evidence/link, decision,
affected sections, release gate**. Required initial entries:

  --------------------------------------------------------------------------
  ID                Decision          Owner             Gate
  ----------------- ----------------- ----------------- --------------------
  D-01              Approve booking   Product + Finance Before
                    fee, tax                            payment/settlement
                    treatment,                          implementation
                    provider-fee                        
                    allocation,                         
                    cinema share,                       
                    refund and                          
                    rounding rules                      

  D-02              Verify TMDB       Product + Legal   Before production
                    commercial                          use of TMDB
                    permissions and                     
                    attribution                         
                    requirements                        

  D-03              Select payment    Payments +        Before payment
                    provider and      Engineering       integration approval
                    verify event,                       
                    refund,                             
                    idempotency, and                    
                    settlement                          
                    capabilities                        

  D-04              Approve hold      Product +         Before checkout
                    expiry and        Payments +        implementation
                    late-payment      Engineering       
                    compensation                        
                    policy                              

  D-05              Approve data      Privacy/Legal +   Before account
                    retention,        Product           deletion and launch
                    anonymization,                      
                    and legal-hold                      
                    schedule                            

  D-06              Approve walk-up   Operations        Before pilot
                    sales and                           
                    seat-block                          
                    operating                           
                    procedure with                      
                    pilot cinemas                       

  D-07              Define showtime   Product +         Before schedule
                    overlap policy    Engineering +     implementation
                    and hall layout   Cinema Ops        
                    versioning                          

  D-08              Define            Operations +      Before pilot
                    ticket-scan       Security          
                    outage/manual                       
                    fallback and                        
                    confirm whether                     
                    offline scanning                    
                    is excluded                         

  D-09              Define financial  Finance +         Before real-money
                    approval          Platform Ops      pilot
                    separation and                      
                    material-refund                     
                    threshold                           

  D-10              Validate mobile   Mobile Lead       Before release
                    performance                         target is declared
                    device/network                      met
                    benchmark                           
  --------------------------------------------------------------------------

Unresolved decision items remain open; do not invent an answer in
implementation. Where work can safely proceed, use a reversible
interface and mark the dependency.

## 13. Phased roadmap and release gates

### Phase 0 --- Close blockers and establish evidence

Before feature implementation is approved: - Assign owners and due dates
to every P0/P1 risk and decision. - Resolve D-01 through D-05 or
explicitly block affected work. - Approve the canonical state machine
and single authoritative hold expiry. - Review the final PostgreSQL
schema and required SQL constraints. - Document API contracts and
idempotency scopes. - Confirm provider sandbox capabilities and webhook
signature verification. - Approve data retention and admin audit
requirements.

**Exit:** Product, Engineering, Payments, and Finance agree on the
relevant decisions; no unresolved P0 design blocker.

### Phase 1 --- Data integrity and transactional core

-   Implement PostgreSQL schema and versioned migrations.
-   Add inventory, booking-seat, provider-event, refund, ticket,
    idempotency, outbox, job, ledger, and audit constraints.
-   Implement all-or-nothing holds, authoritative expiry, atomic booking
    confirmation, and safe cancellation/blocking transitions.
-   Implement invariant audit scripts and CI migration checks.
-   Run concurrency and race tests against PostgreSQL.

**Exit:** Zero duplicate allocations under concurrency; all-or-nothing
hold tests pass; invariant audit is clean; migrations reproduce required
constraints.

### Phase 2 --- Durable payment and recovery

-   Implement durable webhook inbox and idempotent processor.
-   Implement provider-specific event validation, retries, and
    manual-review queue.
-   Implement payment/refund idempotency, reconciliation cases, and
    immutable financial entries.
-   Implement durable notification outbox and shared job leases.
-   Test worker crash, duplicate events, provider timeout, refund retry,
    and late settlement adjustment.

**Exit:** No valid provider event can be acknowledged without durable
persistence; no retry duplicates a charge/refund/ticket/ledger movement;
unresolved mismatches are visible and actionable.

### Phase 3 --- Product workflows and operational readiness

-   Complete discovery, hall/showtime setup, seat map, checkout, ticket
    retrieval, scan, admin, refund, and settlement workflows.
-   Validate cinema walk-up sales process.
-   Complete role/tenant authorization, admin audit, rate limits,
    backup/restore test, dashboards, alerts, and runbooks.
-   Complete mobile performance benchmark and accessibility review.
-   Complete legal, provider, privacy, finance, and app-store approvals.

**Exit:** End-to-end tests pass; operations can respond to payment,
refund, scan, and provider incidents; external launch gates are closed.

### Phase 4 --- Controlled pilot

-   Onboard five cinemas as the initial pilot cohort, subject to
    readiness and agreement.
-   Start with the provider sandbox and operational dry run; real-money
    transactions begin only after approval.
-   Observe customers, Cinema Admins, and Door Staff; record workflow
    failures and support contacts.
-   Review daily payment/reconciliation cases, inventory audit, refund
    state, scan errors, and job lag.
-   Maintain a documented stop/rollback procedure.

**Pilot exit:** No double booking; no unexplained financial mismatch;
all critical events reconcile or have an owned case; operational and
product targets are evaluated against agreed evidence. Product,
Engineering, Payments, Finance, and Operations jointly approve expansion
or decide to revise/stop.

### Phase 5 --- Expansion and later features

Potential later work includes POS integration, WebSocket seat updates,
waiting room, offline scanning, and other currencies. Each requires its
own product decision, security/operations review, and acceptance
criteria. Do not add these to MVP merely to address problems that can be
solved by the current architecture and documented controls.

## 14. Open questions and launch blockers

The following are intentionally explicit; this PRD does not pretend
these decisions have already been made.

  --------------------------------------------------------------------------
  Question          Status            Owner             Deadline / gate
  ----------------- ----------------- ----------------- --------------------
  What is the       **BLOCKER**       Product + Finance Before
  booking fee, and                                      payment/settlement
  how are taxes and                                     implementation
  provider fees                                         
  allocated?                                            

  Is the booking    **BLOCKER**       Product + Finance Before refund
  fee refundable on                                     implementation
  customer refund                                       
  or showtime                                           
  cancellation?                                         

  Which payment     **BLOCKER**       Payments +        Before integration
  provider and                        Product           approval
  payment methods                                       
  will launch?                                          

  What does the     **BLOCKER**       Payments +        Before payment
  provider                            Engineering       integration approval
  guarantee about                                       
  event IDs,                                            
  webhook retries,                                      
  idempotency,                                          
  partial refunds,                                      
  chargebacks, and                                      
  settlement                                            
  reports?                                              

  What is the       **BLOCKER**       Product +         Before checkout
  approved policy                     Payments +        implementation
  for payment                         Engineering       
  success arriving                                      
  after hold expiry                                     
  or seat                                               
  reassignment?                                         

  What are the      **BLOCKER**       Privacy/Legal +   Before launch
  retention periods                   Product           
  for booking,                                          
  payment, webhook,                                     
  audit, and                                            
  account data?                                         

  Has TMDB          **BLOCKER**       Product + Legal   Before production
  commercial use                                        movie-data use
  been approved?                                        

  How will cinemas  **BLOCKER**       Operations +      Before pilot
  ensure every                        Cinema            
  walk-up sale is                                       
  represented in                                        
  Matinee                                               
  inventory?                                            

  Are overlapping   Open              Product +         Before schedule
  showtimes in one                    Engineering       implementation
  hall always                                           
  rejected?                                             

  How are refunds   **BLOCKER**       Finance +         Before real-money
  approved, and                       Platform Ops      pilot
  when is                                               
  second-person                                         
  approval                                              
  required?                                             

  What is the       Open              Operations +      Before pilot
  operational                         Security          
  fallback if                                           
  ticket scanning                                       
  cannot reach the                                      
  server?                                               

  Which devices and Open              Mobile Lead       Before performance
  network profile                                       sign-off
  define the mobile                                     
  performance gate?                                     

  What payout       **BLOCKER**       Finance +         Before real-money
  schedule and                        Payments          pilot
  evidence mark a                                       
  cinema settlement                                     
  as paid?                                              
  --------------------------------------------------------------------------

A blocker may be closed only when the decision register includes the
decision, owner, date, and supporting evidence.

## 15. Build-ready acceptance checklist

### A. Product and external decisions

-   [ ] Booking fee, tax, provider fee, cinema share, refund and
    rounding rules approved.
-   [ ] Payment provider selected and required capabilities verified in
    sandbox.
-   [ ] TMDB commercial-use/attribution permission verified or
    integration disabled.
-   [ ] Hold duration and late-payment compensation policy approved.
-   [ ] Retention/anonymization/legal-hold policy approved.
-   [ ] Walk-up seat-block process agreed with pilot cinemas.
-   [ ] Admin refund and settlement approval policy documented.

### B. Database and transactional invariants

-   [ ] PostgreSQL is the authoritative production database.
-   [ ] Versioned migrations include all required constraints, indexes,
    and raw SQL invariants.
-   [ ] One authoritative hold expiry (`Hold.expiresAt`) is implemented.
-   [ ] Multi-seat holds are atomic and all-or-nothing.
-   [ ] Booking confirmation atomically validates payment, hold,
    showtime, and all seats.
-   [ ] Database constraints prevent duplicate active holds and
    duplicate confirmed seat allocations.
-   [ ] BookingSeat-to-booking/showtime integrity is enforced in the
    database.
-   [ ] Refunds, payment events, tickets, ledger entries, and audit
    history are not destructively deleted.
-   [ ] Invariant audit runs in CI and can be run against production
    read-only.

### C. Durable processing and financial recovery

-   [ ] Valid webhook is durably stored before acknowledgement.
-   [ ] Event processing is retryable, idempotent, and observable.
-   [ ] Duplicate/out-of-order/unknown provider events are handled
    explicitly.
-   [ ] Refund operations use idempotency keys and unique logical
    operation identity.
-   [ ] Notification intents use a transactional outbox.
-   [ ] Background jobs use shared leases/coordination and bounded
    retries.
-   [ ] Reconciliation cases are durable, owned, and auditable.
-   [ ] Ledger and settlement adjustments preserve history for late
    refunds/chargebacks.
-   [ ] Provider failure, DB failover, worker crash, and
    duplicate-worker tests pass.

### D. Security and operations

-   [ ] Cinema tenant authorization and least-privilege roles are
    tested.
-   [ ] Sensitive admin actions have reason and audit trail.
-   [ ] Rate limits work across multiple app instances.
-   [ ] Secrets and logs meet security requirements.
-   [ ] Backup restoration has been demonstrated.
-   [ ] Alerts and runbooks cover payment/webhook lag, failed jobs,
    inventory violations, refund failures, and settlement mismatches.
-   [ ] Retention and deletion workflows are tested against
    financial/legal holds.
-   [ ] Ticket scan is atomic and duplicate scans cannot admit twice.

### E. Product quality and pilot

-   [ ] Metric dictionary is approved and matches all goal/dashboard
    definitions.
-   [ ] Load-test report includes environment, workload, latency,
    errors, database metrics, and invariant audit.
-   [ ] Mobile performance benchmark is reproducible.
-   [ ] End-to-end customer, cinema admin, door staff, and platform
    admin workflows pass.
-   [ ] Pilot cinemas are trained on cross-channel inventory and
    incident procedures.
-   [ ] Pilot stop/rollback criteria and decision owners are documented.
-   [ ] No P0 blocker remains open.

## 16. Severity-ranked defect closure order

This list prioritizes the defects found in the v1 review. The labels are
delivery priorities, not a claim that the fixes are already implemented.

### P0 --- Must close before build approval or affected financial/inventory work

1.  **Webhook event loss:** durable event persistence before
    acknowledgement; retryable processor and alert/manual-review path.
2.  **Conflicting hold expiry:** `Hold.expiresAt` is authoritative; any
    duplicate field is derived only.
3.  **Booking/payment/refund recovery:** explicit state transitions,
    transaction boundaries, reconciliation, and operator-visible
    exceptions.
4.  **Duplicate refunds:** idempotency, unique operation identity,
    provider-specific retry rules.
5.  **Seat-to-booking integrity:** database-enforced uniqueness and
    same-showtime relationship.
6.  **Late refund/settlement adjustment:** immutable ledger entries and
    adjustment in a later settlement period.

### P1 --- Must close before real-money pilot

7.  Durable notification outbox.
8.  Multi-instance-safe durable job processing and leases.
9.  Cancellation/payment/blocking races covered by atomic transitions.
10. Complete PostgreSQL migrations and schema-drift checks.
11. Explicit cross-channel inventory process for walk-up sales.
12. Approved business model, tax, provider-fee, and refund rules.
13. External provider, TMDB, legal, privacy, and app-store approvals.
14. Shared rate limits across instances.
15. Data retention and deletion policy.
16. Aligned metrics and definitions.
17. Reproducible load-test report.
18. Show-time ownership, overlap, and layout versioning.
19. Owned assumptions/decision register.
20. Atomic, idempotent ticket scan.
21. Admin authorization and audit trail.

### P2 --- Close before broad rollout or as explicitly scheduled

22. Reproducible mobile quality targets.
23. Pilot validation of untested workflows and operational assumptions.

## 17. Final implementation rule

Matinee is not ready for unconditional build approval until the P0
design decisions and invariant contracts are agreed. The core
architecture need not be replaced: a modular application, PostgreSQL,
Prisma, versioned SQL migrations, and a durable database-backed job
system can meet the MVP needs if the required invariants and recovery
behaviour are demonstrated.

The implementation order is deliberate: close
product/finance/provider/privacy decisions; enforce database and
transactional invariants; implement durable payment/refund/event
recovery; then finish product workflows and operations; then run a
controlled pilot. A feature is not complete merely because the happy
path works. It is complete when retries, concurrency, interruption,
reconciliation, and auditability have been tested and the relevant
acceptance evidence is recorded.
