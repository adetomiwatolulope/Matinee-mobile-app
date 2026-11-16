# Security Rules — Matinee

## 1. Security authority

- Read `AGENTS.md` and the relevant PRD security, privacy, access, and operational sections before changing security-sensitive code.
- Treat security, privacy, payment integrity, and authorization as release-critical.
- Apply least privilege and secure defaults.
- Do not invent legal, privacy, or retention requirements. Keep unresolved decisions visible and block affected release gates.
- Never treat a hidden UI control as an authorization mechanism.

## 2. Authentication

- Enforce authentication on every protected server operation.
- Validate credentials and session state on the server.
- Follow the approved authentication policy and the PRD's initial assumptions, subject to the required security review.
- The PRD's initial account assumptions include a password of at least 10 characters, six-digit email verification codes valid for 10 minutes, and invalidation after the sixth wrong attempt. Confirm these assumptions during security review before treating them as final policy.
- The PRD's initial token assumptions are 15-minute access tokens and 30-day rotating refresh tokens stored hashed. Confirm these assumptions during security review.
- Store refresh tokens hashed; never store raw refresh tokens as database values.
- Rotate refresh tokens on use.
- Detect reuse of rotated refresh tokens and revoke the affected session family.
- Password reset must revoke the user's refresh tokens.
- Support revocation of all user sessions.
- Do not log passwords, verification codes, access tokens, refresh tokens, or authorization headers.
- Use secure password hashing with a maintained, approved password-hashing implementation.
- Do not invent a password hashing algorithm or token format. Follow the approved implementation and repository conventions.

## 3. Authorization and tenant isolation

- Enforce authorization on the server for every protected operation.
- Apply least privilege.
- Keep Customer, Cinema Admin, Door Staff, and Platform Admin permissions separate.
- Scope Cinema Admin and Door Staff access to their assigned cinema.
- Validate cinema membership and role on every relevant request.
- Never trust a client-supplied `cinemaId`, `userId`, booking ID, or resource ID as proof of authorization.
- Prevent insecure direct object reference (IDOR) vulnerabilities.
- Do not allow Door Staff to change prices, issue refunds, manage users, or perform unrelated administrative actions.
- Do not grant cinema users broad Platform Admin permissions.
- Check authorization again inside sensitive service operations where a route-level check alone could be bypassed.
- Test cross-cinema access and privilege escalation attempts.

## 4. Secrets and environment security

- Store production secrets in an approved secret manager.
- Never hard-code secrets.
- Never commit API keys, database passwords, signing keys, private keys, access tokens, or Flutterwave webhook secrets.
- Never expose server secrets through client bundles, public environment variables, source maps, logs, or error responses.
- Use separate credentials and provider configuration for development, test, staging/sandbox, and production.
- Restrict access to secrets by role and operational need.
- Rotate exposed or compromised secrets immediately.
- Validate required configuration at startup and fail safely when critical secrets are missing.
- Do not use production credentials in local development or automated tests.

## 5. API and input security

- Treat all client input, webhook bodies, external API responses, uploaded files, and environment values as untrusted.
- Validate and normalize input at system boundaries.
- Enforce request size and content-type limits.
- Use parameterized database queries. Do not construct SQL using untrusted string concatenation.
- Prevent mass assignment by explicitly selecting fields that a caller may change.
- Do not allow clients to set authoritative payment status, booking status, inventory state, role, settlement amount, or ticket scan state.
- Return safe errors that do not reveal stack traces, SQL internals, secrets, or private records.
- Apply appropriate CORS, CSRF, and browser security protections to web surfaces according to their authentication model.
- Protect endpoints against brute force, enumeration, replay, and abuse.
- Use shared rate limits across application instances.
- Configure separate rate limits for authentication, holds, checkout, webhooks, ticket scans, admin actions, and notifications.
- Protect provider webhook endpoints without blocking legitimate provider retries.

## 6. Payment and webhook security

- Use Flutterwave as the approved payment provider.
- Verify provider capabilities and security requirements against current official provider documentation before integration approval.
- Verify webhook signatures and any required timestamp/nonce/replay controls.
- Do not trust a client redirect or client-submitted payment status.
- Verify amount, currency, internal reference, provider reference, and expected booking/payment relationship.
- Persist valid provider events durably before acknowledging them.
- Deduplicate events.
- Make event processing idempotent.
- Restrict access to stored provider payloads.
- Minimize sensitive provider data retained.
- Keep unresolved provider/booking mismatches visible and actionable.
- Never expose provider secrets or sensitive event payloads in logs or client responses.

## 7. Data privacy

- Collect only personal data required for an approved product or operational purpose.
- Restrict access to personal, authentication, payment, support, audit, and provider-event data.
- Do not expose another customer's identity or booking details in seat-map responses.
- Do not put personal information in QR codes.
- Do not log full sensitive request or provider payloads.
- Redact sensitive fields in logs and audit records.
- Do not send personal or sensitive data to external AI services without explicit approval and appropriate safeguards.
- Define retention and deletion by data class only after the approved privacy/legal decision.
- Preserve records subject to legal, financial, or audit retention requirements.
- Do not delete financial or audit evidence merely because an account deletion request was received.
- Apply soft deletion and anonymization only according to the approved retention policy.

## 8. Administrative audit

- Audit sensitive administrative actions.
- Include actor, action, entity, timestamp, request/correlation ID, and relevant before/after values.
- Redact secrets and unnecessary personal data from audit records.
- Require a reason for sensitive operations such as refunds, settlement actions, seat blocks, schedule changes, cancellations, and permission changes.
- Restrict audit-log access.
- Do not allow ordinary users or cinema staff to edit or delete audit history.
- Keep privileged actions traceable to an authenticated actor.

## 9. Ticket and admission security

- Use signed or opaque QR tokens.
- Do not encode personal information or predictable booking IDs in QR content.
- Validate ticket state against server-authoritative booking, payment, refund, cancellation, and scan state.
- Make ticket scanning atomic.
- Reject duplicate scans.
- Do not let screenshots, local QR decoding, or cached client state authorize admission.
- Do not introduce offline scanning without an approved threat model and conflict policy.
- Keep manual fallback procedures documented and permissioned.

## 10. Logging, monitoring, and incident response

- Use structured logs with request and correlation identifiers.
- Redact secrets, credentials, sensitive personal data, and unnecessary provider payload fields.
- Monitor authentication abuse, authorization failures, API errors, database health, webhook lag, payment mismatches, refund failures, job failures, ticket-scan errors, and settlement discrepancies.
- Alert on inventory invariant violations and unresolved financial mismatches.
- Document incident procedures for payment/webhook failures, duplicate bookings, provider outages, refund failures, data breaches, and database recovery.
- Preserve relevant evidence during incidents.
- Do not silently repair financial or inventory records without an auditable correction process.

## 11. Security verification

- Test authentication and session revocation.
- Test role separation and cinema scoping.
- Test IDOR and privilege escalation.
- Test rate limits across multiple application instances.
- Test webhook signature rejection and replay/duplicate handling.
- Test secret and sensitive-data exposure in logs and responses.
- Test ticket-scan replay and concurrency.
- Test retention/deletion behaviour against legal and financial holds.
- Complete a security/privacy review before real-money launch.
- Do not claim security compliance or certification without documented evidence.