# Upload and Storage Rules — Matinee

## 1. Authority and scope

- Read `AGENTS.md`, `security.md`, and the relevant PRD sections before implementing file storage or upload behaviour.
- The PRD does not define a general customer file-upload feature or approve a storage vendor.
- Do not build profile-image, cinema-document, chat-attachment, or other upload features unless the product scope is explicitly approved.
- Do not choose an external storage provider without an approved architecture decision.
- Do not treat TMDB movie images as Matinee-owned uploads. Respect the approved TMDB access, commercial-use, caching, and attribution rules.
- Keep upload and storage functionality out of the MVP unless an approved requirement needs it.

## 2. Storage ownership and boundaries

- Store files only when an approved product or operational requirement needs them.
- Use an approved storage service or repository-established storage mechanism.
- Do not store uploaded binary files directly in PostgreSQL unless an explicit architecture decision justifies it.
- Store file metadata and ownership references in PostgreSQL where required.
- Keep file storage behind an application boundary so the provider can be changed through an approved migration without leaking provider-specific details into domain logic.
- Keep development, test, staging, and production storage isolated.
- Never use production customer files in development or automated tests.
- Do not expose internal storage paths or credentials to clients.

## 3. Upload validation

For any approved upload feature:

- Treat the filename, extension, MIME type, content, and metadata as untrusted.
- Enforce an approved maximum file size.
- Enforce an approved allowlist of file types.
- Validate file content using file signatures or safe content inspection; do not trust the extension or browser-provided MIME type alone.
- Generate storage object names on the server. Do not use user-supplied filenames as storage keys.
- Normalize and safely encode display filenames.
- Reject path traversal, malformed names, unexpected formats, and unsupported content.
- Do not execute uploaded files.
- Do not serve uploaded content from an executable application directory.
- Use malware scanning or equivalent inspection when required by the approved threat model and file types.
- Keep upload validation on the server even if the client validates first.
- Do not invent file types, size limits, or scanning vendors. Obtain approval for the relevant feature.

## 4. Access control

- Authenticate and authorize every upload and download operation.
- Verify that the requesting user owns the resource or has the required role and scope.
- Apply cinema-scoped authorization to cinema-owned documents or assets.
- Do not trust client-supplied owner IDs or cinema IDs.
- Use private storage by default for customer, operational, and administrative files.
- Use short-lived signed access URLs when approved and appropriate.
- Keep signed URL lifetimes limited to the required access window.
- Do not expose private files through guessable public URLs.
- Do not allow one cinema or customer to access another party's files.
- Audit sensitive upload, download, replacement, and deletion actions where appropriate.

## 5. File metadata and integrity

- Record the minimum metadata needed for ownership, retrieval, validation, and lifecycle management.
- Where appropriate, record the storage key, original display name, detected content type, size, owner/resource reference, checksum, upload time, and status.
- Do not use a client-provided checksum as proof that content is safe.
- Make upload completion explicit. Do not expose an incomplete object as a valid asset.
- Handle interrupted uploads and orphaned objects through a documented cleanup process.
- Make replacement and deletion operations traceable where the file is operationally important.
- Do not overwrite an existing file in a way that destroys evidence or breaks references without an approved replacement policy.

## 6. QR codes and tickets

- Ticket QR codes are not general file uploads.
- QR content must be signed or opaque and must not contain personal information or predictable booking IDs.
- Validate ticket state against the server-authoritative booking, payment, refund, cancellation, and scan state.
- Do not authorize admission based on a QR image file, screenshot, local decode, or cached status alone.
- Do not store ticket QR images as the authoritative ticket record.
- Keep the ticket token and its authoritative status in the application/database model.

## 7. External images and TMDB

- Treat external movie metadata and image URLs as provider-sourced data.
- Confirm TMDB commercial-use and attribution permissions before production use.
- Follow the approved caching and refresh policy.
- Do not download, mirror, or redistribute external images unless the relevant rights and policy allow it.
- Handle unavailable external images gracefully.
- Do not make the external image provider the source of truth for Matinee-owned cinema, hall, seat, booking, or ticket data.

## 8. Retention and deletion

- Define retention by data class and approved legal/privacy requirements.
- Do not invent retention periods.
- Delete or anonymize files only according to the approved retention and legal-hold policy.
- Preserve files or evidence subject to legal, financial, fraud, or audit obligations.
- When a user requests account deletion, do not automatically delete records or files that must be retained.
- Ensure deletion workflows remove eligible stored objects and associated metadata without breaking retained financial/audit records.
- Make deletion retryable and auditable.
- Monitor failed deletion jobs and orphaned objects.

## 9. Storage security and operations

- Keep storage credentials in an approved secret manager.
- Never commit storage credentials or signed URLs.
- Encrypt data in transit and use the approved at-rest protection.
- Restrict storage access using least privilege.
- Keep storage buckets/containers private unless public access is explicitly approved for a specific asset class.
- Log access and operational failures without logging sensitive file contents.
- Back up critical file metadata and define recovery for stored objects.
- Verify that backups can be restored.
- Monitor storage failures, access-denied errors, orphaned objects, cleanup failures, and abnormal access patterns.

## 10. Release checklist for an approved upload feature

- [ ] Product scope and allowed file types are approved.
- [ ] Storage provider and data location are approved.
- [ ] File size and content validation are implemented server-side.
- [ ] Ownership and authorization are enforced.
- [ ] Private access is the default.
- [ ] Malware/content inspection requirements are addressed.
- [ ] Metadata and integrity checks are implemented.
- [ ] Interrupted upload and orphan cleanup paths are tested.
- [ ] Retention, deletion, and legal-hold behaviour are approved.
- [ ] Logging and monitoring avoid exposing file contents or secrets.
- [ ] Security and privacy review is complete.