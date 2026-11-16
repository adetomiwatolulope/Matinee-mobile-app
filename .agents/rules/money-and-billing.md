# Money and Billing Rules — Matinee

## 1. Authority and payment provider

- Read `AGENTS.md` and PRD Sections 5.5–5.6, 7.3, and 8 before changing money, checkout, payment, refund, ledger, or settlement behaviour.
- **Flutterwave is the approved payment provider.**
- Do not substitute Paystack, Stripe, or another provider without an explicit approved project decision.
- Keep Flutterwave-specific requests, responses, signatures, and SDK details behind a provider adapter.
- Verify Flutterwave's current official documentation, sandbox behaviour, webhook signature mechanism, idempotency support, refund semantics, and settlement capabilities before relying on them.
- Do not assume a provider capability exists because another provider supports it.
- Do not invent a payment or refund policy.

## 2. Currency and money representation

- Matinee's initial currency is NGN.
- Persist monetary amounts as integer kobo.
- Never use binary floating-point arithmetic for money.
- Never persist a formatted currency string as the authoritative amount.
- Use explicit field names such as `amountKobo`, `ticketPriceKobo`, and `refundAmountKobo`.
- Keep currency explicit on financial records where required.
- Convert kobo to a display string only at the presentation boundary.
- Use documented rounding rules for all monetary calculations.
- Reject invalid, negative, out-of-range, or malformed amounts at the server boundary.
- Do not trust amounts submitted by the client.

## 3. Pricing and checkout

- Calculate all authoritative prices on the server.
- Derive checkout totals from trusted showtime/ticket pricing and approved fee/tax rules.
- Keep ticket price, booking fee, tax, provider charge, refund, and cinema settlement values separate.
- Return the server-calculated amount and currency to the client for display and payment initiation.
- Revalidate price and booking eligibility at the appropriate transaction boundary.
- Do not allow the client to choose an arbitrary payment amount.
- Do not activate or hard-code the booking fee until Product and Finance approve the amount and economics.
- Do not invent tax treatment, fee allocation, or rounding policy.
- A price or fee change must be traceable to the approved pricing policy and the relevant showtime/booking snapshot.
- Clearly communicate the payable amount before the customer commits to checkout.

## 4. Payment attempts and idempotency

- Create a stable internal payment reference for each logical payment attempt.
- Use idempotency keys for checkout and payment operations.
- Store the key's scope, request fingerprint, status, and result reference.
- Reject reuse of an idempotency key with a different request payload.
- Repeated client submissions must resolve to the same logical payment attempt where appropriate.
- Do not create duplicate charges because a customer double-taps, retries after a timeout, reinstalls the app, or resubmits checkout.
- Do not hold long-running database locks while calling Flutterwave.
- Persist enough information to reconcile the internal attempt with the provider transaction.
- Do not treat a browser/app redirect as payment proof.

## 5. Payment verification

- Verify payment through a trusted server-side Flutterwave verification mechanism.
- Validate provider reference, internal reference, expected amount, currency, and applicable transaction status.
- Reject mismatched amounts, currencies, references, or booking relationships.
- Never mark a booking paid based only on client input.
- Keep payment state separate from booking state.
- A provider-confirmed charge does not by itself prove that seats were safely confirmed.
- Coordinate booking confirmation and inventory allocation through the approved atomic workflow.
- If payment status is ambiguous, show a pending/recovery state rather than falsely declaring failure.
- If a late successful payment conflicts with expired or unavailable inventory, follow the approved compensation/refund policy. Never force-confirm a conflicting booking.

## 6. Webhooks and provider events

- Verify Flutterwave webhook signatures using the documented provider mechanism.
- Apply any required timestamp, replay, and request validation rules.
- Persist a valid event durably before acknowledging receipt.
- If durable persistence fails, do not acknowledge successful receipt.
- Store provider event identity or a stable provider-specific deduplication key.
- Store the received time, payment reference, signature-validation result, processing status, attempts, and correlation information.
- Minimize and restrict access to stored payloads.
- Separate event persistence from business-effect processing.
- Process persisted events through a durable retryable mechanism.
- Mark an event processed only after its business transaction commits.
- Handle duplicate, delayed, out-of-order, unknown, and contradictory events.
- Never silently discard an event.
- Keep unresolved cases visible in a retry or manual-review queue.

## 7. Payment state

- Model payment as an explicit state machine.
- Document valid transitions and reject invalid transitions.
- Do not regress a final state because an old event was replayed.
- Keep ambiguous or contradictory outcomes recoverable.
- Distinguish provider charge success from booking confirmation.
- Do not delete or overwrite a payment record to resolve a mismatch.
- Preserve provider references and reconciliation evidence.
- Make all processing idempotent.

## 8. Refunds

- Implement refunds only through the approved authorization and approval workflow.
- Give each logical refund a stable internal ID and idempotency key.
- Record amount, currency, reason, actor, timestamps, booking/payment reference, and provider reference where available.
- Represent full and partial refunds accurately.
- Do not create duplicate refunds when an operator retries an action.
- Track requested, submitted, succeeded, failed, and needs-review states as appropriate.
- Do not mark a refund complete merely because a request was sent.
- Retry only when Flutterwave's documented semantics make retry safe.
- Keep provider refund outcomes and internal refund records reconcilable.
- Do not invent customer-initiated cancellation or refund eligibility.
- A showtime cancellation must create eligible refund work durably and idempotently.
- A failed refund must remain visible to an operator.

## 9. Ledger and financial history

- Represent money movements using immutable ledger entries or an equivalent append-only record model.
- Preserve original payment, refund, fee, adjustment, and settlement history.
- Correct errors through reversal or adjustment entries.
- Never rewrite or delete financial history to make totals appear correct.
- Link every adjustment to the original transaction and reason.
- Make ledger entries idempotent so retries cannot duplicate financial effects.
- Reconcile ledger entries to provider evidence.
- Keep audit records for privileged financial actions.
- Restrict access to financial records by role and operational need.

## 10. Cinema settlement

- Do not calculate or release real cinema payouts until Finance approves the formulas.
- Obtain explicit approval for gross ticket value, booking fee, tax, provider fee, cinema share, refund allocation, chargeback allocation, reserves, timing, and rounding.
- Keep settlement preparation and approval separated where staffing permits.
- Apply the approved second-person review process for material amounts.
- Record settlement run state, included source records, totals, approval history, payout reference, and reconciliation result.
- Do not mark a settlement as paid merely because a payout request was submitted.
- Reconcile settlement reports against internal ledger and provider records.
- Handle late refunds and chargebacks as traceable adjustments in the appropriate later settlement period.
- Never silently rewrite a completed settlement.

## 11. Reconciliation and exception handling

- Reconcile Matinee payment/refund records against Flutterwave transactions and refund reports.
- Reconcile settlement/payout reports where available.
- Create a durable case for each mismatch.
- Record category, amount, currency, affected records, first-seen time, owner, status, attempted action, and resolution evidence.
- Make reconciliation repeatable and idempotent.
- Do not automatically overwrite conflicting source records.
- Alert on aging and material unresolved mismatches.
- Provide retry and manual-review paths.
- Preserve evidence for investigation.

## 12. User-facing payment language

- Distinguish pending, successful, failed, expired, cancelled, and needs-attention outcomes.
- Do not tell the customer payment failed solely because the app timed out.
- Do not tell the customer a booking is confirmed before the authoritative booking workflow succeeds.
- Provide a way to retrieve current payment and booking status.
- Do not tell a customer a refund is complete while it is pending or under review.
- Never expose provider credentials, raw webhook data, or internal reconciliation details to customers.

## 13. Release blockers

Do not enable real-money pilot until:

- [ ] Flutterwave capabilities and sandbox behaviour are verified.
- [ ] Webhook signature verification is implemented and tested.
- [ ] Durable event persistence and retry processing are implemented.
- [ ] Payment and booking state transitions are documented and tested.
- [ ] Idempotency prevents duplicate charges and financial effects.
- [ ] Late-payment/expired-hold policy is approved.
- [ ] Booking-fee and tax rules are approved.
- [ ] Refund policy and approval controls are approved.
- [ ] Provider-fee allocation and cinema settlement formulas are approved.
- [ ] Ledger and reconciliation workflows are operational.
- [ ] Finance and operational owners approve the real-money release gate.