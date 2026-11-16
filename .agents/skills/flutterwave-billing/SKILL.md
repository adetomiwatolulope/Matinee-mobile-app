---
name: flutterwave-billing
description: Use whenever payment, kobo, webhook, refund, chargeback, ledger, booking-fee, or cinema-settlement state changes.
---

# Flutterwave Billing

## Trigger
Any flow where money moves or financial state changes: payment initiation, webhook, verification, refund, chargeback, booking fee, provider fee, ledger entry, cinema payable, payout, settlement, or financial reconciliation.

## Mandatory gates and sources
1. Read `AGENTS.md` and Matinee PRD §§5.5–5.6, 7, 8, 10, 12–17.
2. Flutterwave is the locked provider. Never substitute another provider.
3. Before writing provider code, read current official Flutterwave documentation and verify the exact endpoint, headers/signature, event identifiers, idempotency support, verification flow, refund semantics, chargebacks, and settlement capabilities. Do not guess provider fields or headers.
4. The PRD is a revised draft with blockers. Do not activate real-money payment/settlement behaviour until relevant Product, Finance, Payments, Legal, and provider gates are closed with written evidence.

## Money and financial definitions
- Persist every amount as integer NGN kobo. Never use binary floating point.
- Derive authoritative totals on the server. Never trust client-submitted amount, fee, tax, or payment status.
- Keep ticket face value, booking fee, taxes, provider charges, refunds, cinema payable, payout, reversal, and adjustment distinct.
- Booking fee, tax treatment, provider-fee allocation, cinema share, refund treatment, and rounding rules are BLOCKERS until Product/Finance approval and worked examples exist. Do not hard-code a proposed number or formula.
- Snapshot approved fee/tax/commission values on the booking/financial transaction; later configuration changes must not rewrite history.
- Financial ledger entries are immutable. Every entry must carry currency, integer amount, source event/reference, effective/created time, and audit/correlation reference as specified by the finalized schema.
- Correct financial mistakes with traceable compensating entries or approved adjustments. Late refunds/chargebacks after settlement become later settlement adjustments; do not silently edit settled history.

## Webhook and event order of operations
1. Receive the raw request using the provider-required raw-body handling.
2. Verify the signature exactly as current official Flutterwave documentation specifies. Reject invalid signatures; do not parse/transform the body in a way that invalidates signature verification.
3. Validate the event shape and normalize provider data into the internal provider-event contract. Treat all fields as untrusted.
4. Persist the verified provider event durably before acknowledging receipt. Use provider event ID or an approved stable deduplication key. If duplicate, return the provider-appropriate successful acknowledgement without repeating business effects.
5. Acknowledge only after durable persistence succeeds. If persistence fails, return a retryable failure; never acknowledge and silently lose the event.
6. Process the stored event asynchronously/retryably. Compare provider reference, expected amount, currency, payment state, booking state, and event order. Use trusted provider verification where required by current docs and approved integration policy.
7. Apply booking/payment/ledger effects through explicit state transitions and transactional/idempotent domain operations. A provider `SUCCEEDED` charge alone does not prove the booking was safely confirmed; validate hold expiry and all seat allocations atomically.
8. Record processing outcome, correlation/audit data, and `processedAt`/equivalent status in the existing schema. Unresolved or contradictory events enter a durable retry/manual-review queue.

Never trust a client redirect as payment proof. Never force-confirm a booking when seats have expired or been reassigned. The late-payment compensation/race policy is a blocker and must be approved before implementation.

## Idempotency and ledger pairing
- Use a unique internal payment reference and provider idempotency where supported and verified. Do not assume provider idempotency semantics.
- Deduplicate provider events and make payment, booking confirmation, refund, ticket issuance, and ledger effects idempotent.
- A repeated refund request with the same idempotency key resolves to the same logical refund. Provider retries must not create duplicate refunds or ledger movements.
- Coordinate booking confirmation and financial ledger effects in a recoverable transaction/workflow. If one side fails, persist a durable exception and reconcile; never leave an unexplained paid-but-unconfirmed state.
- Use immutable ledger entries for charges, refunds, fees, cinema payable, payout, reversal, and adjustment. Do not update/delete old entries to force a balance.
- Do not invent a mutable credits balance or balance/ledger schema beyond the approved Matinee financial model.

## Refunds, chargebacks, and settlement
- Distinguish refund requested, submitted, pending, succeeded, failed, and needs-review states. Never describe pending as completed.
- Refund approval, partial-refund eligibility, refund formula, provider capabilities, chargeback handling, settlement formula/timing/reserves, and second-person approval thresholds require explicit owner decisions.
- Keep provider records reconciled against internal payment and ledger records. Conflicts become owned, durable cases.
- Keep settlement history immutable. A late refund/chargeback creates an adjustment in a later settlement period.

## Tests
Test invalid signature, durable-persist-before-ack, duplicate/out-of-order events, provider timeout, amount/currency/reference mismatch, verification failure, worker crash after persistence, late success after hold expiry, duplicate payment/refund requests, partial/full refund states, immutable ledger, late settlement adjustment, and recovery/manual-review visibility. Use official-doc-backed sandbox fixtures; report what is and is not verified.