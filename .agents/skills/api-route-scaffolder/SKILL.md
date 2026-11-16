---
name: api-route-scaffolder
description: Use for any new or edited API route, endpoint, webhook handler, server action, or protected request boundary.
---

# API Route Scaffolder

## Trigger
Any new or edited route, endpoint, webhook, server action, or request handler, including admin, customer, payment, ticket-scan, and provider callback endpoints.

## Required opening ritual — exact order
Every protected route must follow this order and fail closed:

1. **Session:** establish the authenticated principal/session. Reject missing, expired, revoked, or invalid credentials before accessing protected data.
2. **Input:** parse and validate path, query, headers, and body at runtime with the repository's established validation library/schema. Reject malformed input before domain work.
3. **Ownership:** resolve authorization from trusted database relationships. Scope cinema resources to an active `CinemaStaff` membership and role; a client-supplied cinema ID is never proof of access. Apply least privilege for Customer, Cinema Admin, Door Staff, and Platform Admin.
4. **Limits:** apply shared, multi-instance-safe rate limits and abuse controls appropriate to the endpoint. Authentication limits are provisional until security review; provider retries must not be blocked by inappropriate webhook throttles.

Do not reorder these checks or let validation/ownership errors disclose another user's or cinema's records.

## Handler discipline
- Keep handlers thin: boundary checks, input validation, call a domain/service operation, map a typed result to the API contract. Business logic belongs in domain/service modules, not route handlers, UI code, or provider SDK wrappers.
- Keep the API contract explicit: auth, authorization, validation, idempotency, state transitions, error semantics, and response shape.
- Use server-derived prices and state. Never trust client payment status, booking totals, fees, taxes, settlement values, or seat availability.
- Use explicit state transitions and conditional database operations. Do not mark a booking paid from a client redirect or client assertion.
- Every request that changes state must be retry-safe/idempotent where externally retried or double-submitted.
- Return safe structured errors. Never leak stack traces, secrets, provider credentials, personal data, or internal records.
- Add correlation IDs and audit records for sensitive admin actions. Require a reason for privileged changes where the PRD specifies it.
- For webhooks, verify the signature and durably persist the event before acknowledging it. Business processing is a separate retryable stage.

## Blocked-message rule (R31)
The supplied Matinee PRD v2 and `AGENTS.md` do not contain an `R31` rule or its canonical blocked-message text/response shape. Do not invent a status code, message string, payload fields, or retry semantics and label them R31. Search the repository for the authoritative R31 rule; if absent, ask the owner for the exact rule before implementing an R31-dependent path. Until then, use only the repository's already-established safe error contract and record the missing R31 definition as a blocker.

## Tests and completion
Test unauthenticated access, malformed input, cross-user/cross-cinema IDOR attempts, role boundaries, rate limits across instances, duplicate submissions, invalid state transitions, provider signature failures, safe error payloads, and audit/correlation behaviour. Add route/contract tests and integration tests for the domain operation. Report exact commands and results; never claim unrun checks passed.