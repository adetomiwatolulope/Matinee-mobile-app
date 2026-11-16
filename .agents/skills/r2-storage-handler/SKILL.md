---
name: r2-storage-handler
description: Use when files are uploaded, downloaded, signed, stored, or deleted, or when account/data deletion affects stored objects.
---

# R2 Storage Handler

## Trigger
Any file lifecycle or object-storage operation: upload, download, signed URL, object key, metadata row, retention, deletion, or account deletion that may affect stored files.

## Matinee source and scope gate
- Read `AGENTS.md` and Matinee PRD §§5.1, 7, 10, 12–17, especially privacy/retention blockers.
- The supplied Matinee PRD and `AGENTS.md` do not select Cloudflare R2 or define an object-storage provider, file entity, ownership key format, signed-URL policy, immutable-original policy, or object/database deletion protocol.
- Important naming distinction: Matinee PRD risk **R2** means “webhook acknowledged but business processing lost.” It is not Cloudflare R2 storage.
- Do not add Cloudflare R2, storage SDKs, object models, endpoints, or vendor-specific assumptions without an explicit approved architecture/provider decision and corresponding requirements.
- Account deletion/anonymization and retention are blockers. Do not delete stored objects or personal data until the approved retention schedule and legal/financial holds are known.

## Invariants when object storage is explicitly approved
- Every object must be associated with a trusted owner/tenant record. The canonical ownership-encoded key format must be approved before implementation; never invent it or trust a client-supplied key as authorization.
- Authorize against database ownership before upload, download, or signed-URL issuance. Signed URLs must be restricted to one object, one operation, and the approved shortest lifetime.
- Validate file size, type/content, and allowed operation at the boundary. Do not trust extension or client MIME type alone.
- Define the authoritative metadata record and object lifecycle together. Document how partial failures, retries, reconciliation, and orphan cleanup work before implementation.
- Treat original uploads as immutable if that policy is explicitly approved. Transformations create separate derived objects; never overwrite originals.
- Do not log credentials, signed URLs, private keys, sensitive object names, or file contents.
- Keep all operations idempotent and observable. Do not claim atomicity across PostgreSQL and an object store; use a documented recoverable workflow.

## Full row/object deletion-parity procedure
1. Resolve the actor and ownership from trusted database relationships.
2. Check approved retention, legal hold, financial/audit retention, and account-deletion policy before scheduling deletion.
3. Enumerate the database records and exact object keys through the approved metadata source; never infer keys from user input.
4. Persist a durable deletion intent/job before external object operations. Make each object deletion retryable and idempotent.
5. Coordinate metadata state and object deletion using the approved lifecycle protocol. Do not delete the database row first if doing so loses the only object reference needed for retry.
6. Record success/failure per object and keep failed items visible for retry/manual review.
7. Reconcile parity: no live metadata row points to a missing object, and no untracked object remains outside the approved retention policy.
8. Preserve an audit record without retaining unnecessary personal data.

## Tests
Test cross-owner access, forged object keys, expired/wrong-operation signed URLs, invalid content/size, duplicate upload/delete requests, immutable-original behaviour where approved, database/object partial failure, worker crash/retry, orphan reconciliation, and retention/legal-hold enforcement. Do not claim these rules are active for Matinee until the storage provider and lifecycle policy are approved.