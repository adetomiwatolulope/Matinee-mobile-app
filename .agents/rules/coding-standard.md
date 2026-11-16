# Coding Standards — Matinee

## 1. Authority and scope

- Read the repository's root `AGENTS.md` before making changes.
- Read the relevant sections of the approved Matinee PRD before implementing or changing product behaviour.
- Follow existing repository conventions when they are coherent and do not violate `AGENTS.md` or the PRD.
- Do not invent product requirements, business policies, provider capabilities, or architecture decisions.
- Treat unresolved PRD decisions as blockers for affected behaviour.
- Do not implement unapproved MVP scope.

## 2. General implementation rules

- Write code that is explicit, testable, and understandable by another engineer.
- Prefer the smallest coherent change that solves the approved task.
- Keep functions and modules focused on one meaningful responsibility.
- Use descriptive domain names such as `showtimeId`, `holdExpiresAt`, `amountKobo`, and `providerReference`.
- Avoid ambiguous names when domain meaning matters.
- Avoid hidden side effects. Make operations that reserve, release, charge, refund, confirm, cancel, or scan explicit.
- Do not introduce abstractions without a real use case.
- Do not add dependencies before checking existing project capabilities and dependency suitability.
- Do not create generic utility modules that become dumping grounds for unrelated logic.
- Do not silently swallow errors.
- Do not use comments to explain obvious code. Explain non-obvious decisions and business invariants.
- Never weaken type checking, lint rules, validation, or tests merely to make a change pass.

## 3. TypeScript rules

- Use TypeScript for TypeScript application surfaces.
- Preserve the repository's configured strictness.
- Avoid `any`. If unavoidable at an external boundary, isolate it, validate the value, and document why it is necessary.
- Prefer explicit types for domain entities, API contracts, provider boundaries, and database-facing operations.
- Treat all network input, webhook payloads, environment variables, and external service responses as untrusted runtime data.
- Validate runtime data at system boundaries. TypeScript types do not validate incoming JSON.
- Handle discriminated unions and state variants exhaustively.
- Avoid unsafe type assertions. Do not use assertions to bypass validation.
- Do not use non-null assertions to conceal uncertain data.
- Keep domain types independent from UI framework and provider SDK types.

## 4. Domain and application boundaries

- Keep business rules in domain/application services, not React components or route handlers.
- Keep route handlers responsible for transport concerns: authentication context, request parsing, validation, invoking application operations, and mapping responses.
- Keep UI components responsible for presentation and user interaction.
- Keep provider SDK calls behind provider adapters.
- Do not let the Matinee domain depend directly on Flutterwave SDK response objects.
- Do not allow one domain module to reach into another module's private implementation.
- Expose intentional interfaces between modules.
- Keep shared packages small and genuinely reusable.
- Keep authoritative business decisions on the server.

## 5. State and side-effect rules

- Model booking, payment, refund, ticket, and settlement lifecycles as explicit state machines.
- Document valid state transitions.
- Reject invalid transitions.
- Make transition operations conditional on the expected prior state.
- Make retryable operations idempotent.
- Do not rely on client-side state as proof of payment, inventory ownership, ticket validity, or authorization.
- Use transactions for operations that must succeed or fail as one unit.
- Do not make long-running external provider calls while holding database locks.
- Persist durable work before acknowledging an event or request that must survive process failure.
- Keep financial and audit history traceable; do not erase history to repair a failed workflow.

## 6. Money and identifiers

- Represent persisted money as integer kobo.
- Never use JavaScript floating-point arithmetic for monetary calculations.
- Use explicit, documented rounding rules.
- Calculate authoritative prices and totals on the server.
- Never trust client-supplied amounts, fees, taxes, discounts, or settlement totals.
- Use stable IDs and provider references for traceability.
- Do not expose predictable internal identifiers as authorization mechanisms.

## 7. API and error handling

- Define authentication, authorization, validation, response shape, error codes, idempotency behaviour, and retry semantics for APIs.
- Validate all untrusted input at the boundary.
- Return safe, consistent errors.
- Do not expose stack traces, SQL details, secrets, provider credentials, or private records to clients.
- Distinguish validation errors, authorization failures, conflicts, retryable failures, and unexpected server errors.
- Do not report an ambiguous payment as failed solely because a client request timed out.
- Do not report a pending refund as completed.
- Do not report a job or provider operation as successful before authoritative confirmation.
- Include correlation identifiers where needed to trace multi-step workflows.

## 8. Frontend rules

- Follow the approved design system and `design-system-rule.md`.
- Keep presentation separate from business decisions.
- Show loading, empty, stale, success, pending, and error states where relevant.
- Do not display stale seat-map data over newer inventory state.
- Treat client countdowns as informational. The server and database determine hold validity.
- Prevent accidental duplicate submissions in the UI, but still enforce idempotency on the server.
- Make controls accessible by keyboard, screen reader, and touch.
- Do not store secrets in client bundles or browser-accessible configuration.

## 9. Testing rules

- Add or update tests in the same change as the implementation.
- Test business invariants, not only implementation details.
- Use PostgreSQL integration tests for PostgreSQL constraints, locking, transactions, and concurrency.
- Test failure, retry, duplicate-event, and race-condition paths where relevant.
- Do not claim PostgreSQL correctness based only on SQLite tests.
- Test authorization at the server boundary.
- Do not mock away the exact behaviour a test is intended to verify.
- Keep tests deterministic and isolate external services using controlled fixtures or approved sandboxes.
- Never use production customer or payment data as test fixtures.

## 10. Logging and observability

- Use structured logs.
- Include appropriate request and correlation IDs for multi-step workflows.
- Redact secrets, credentials, sensitive personal data, and provider payload fields that are not needed for diagnosis.
- Log enough context to investigate failures without exposing private data.
- Do not swallow errors after logging them.
- Make important background-job and payment failures observable and recoverable.

## 11. Dependency and configuration rules

- Check whether the repository already provides a required capability before adding a package.
- Prefer maintained, appropriately licensed dependencies.
- Pin and update dependencies using the repository's package-manager conventions.
- Do not commit credentials, API keys, webhook secrets, private keys, or local environment files.
- Keep separate configuration and credentials for development, test, staging/sandbox, and production.
- Validate required environment configuration at application startup.

## 12. Completion requirements

A coding task is not complete because the UI appears to work.

Before declaring completion:

- Run relevant tests.
- Run formatting, linting, type checking, and build checks supported by the repository.
- Verify migrations and PostgreSQL-specific behaviour when applicable.
- Verify failure and retry behaviour for affected workflows.
- Review the diff for unrelated changes, secrets, data exposure, and scope creep.
- Update documentation and API contracts where necessary.
- Report exactly which checks were run and which were not.
- State unresolved assumptions and blockers.
- Never claim an unrun test passed.