---
name: ai-provider-adapter
description: Use for any AI provider integration, model adapter, prompt, response normalization, confidence mapping, or AI-assisted workflow.
---

# AI Provider Adapter

## Trigger
Any AI SDK/provider integration, adapter, prompt, model selection, response validation/normalization, confidence mapping, or AI-assisted workflow.

## Phase and product boundary
- Read Matinee PRD §6, §7, §12–17 and `AGENTS.md` before any AI work.
- AI is not in MVP scope for authoritative decisions. It must never determine seat availability, inventory ownership, booking confirmation, payment state, refunds, ticket validity, admission, or settlement amounts.
- The PRD only says AI may be considered later for non-authoritative assistance such as support-agent summaries, after privacy, data-handling, and human-review controls are approved. Do not scaffold an AI feature, add an SDK, or send data to a provider merely because an adapter is requested.
- Any external AI use involving personal/sensitive data requires explicit approval and protection. Keep human review and approval for AI-assisted administrative workflows.

## Adapter rules (only after written approval)
- Keep provider-specific SDKs, payloads, errors, and authentication inside a narrow adapter boundary. Domain modules consume normalized, typed results and never depend on raw vendor response shapes.
- Validate all provider output at runtime. Treat model output as untrusted input, even if it claims to conform to a schema.
- Normalize into an explicit domain result with exhaustive status handling. Preserve uncertainty; never convert missing/ambiguous output into a confident business fact.
- Confidence mapping must have a documented, approved scale and calibration/evaluation evidence. The Matinee PRD does not define confidence levels or thresholds; do not invent them.
- Do not log prompts, sensitive payloads, credentials, or unnecessary personal data. Persist only the minimum approved audit/usage metadata.
- Provider failure, timeout, malformed output, refusal, or low confidence must fail safely and leave authoritative Matinee state unchanged.
- AI suggestions must not trigger payment, refund, booking, ticket, admission, or settlement side effects without a separately approved deterministic policy and authorized workflow.

## AiService contract, R11, fabrication net, and sign-offs
The supplied Matinee PRD v2 and `AGENTS.md` define no `AiService` interface/contract, no AI fabrication net, and no AI enforcement mechanism for R11. In Matinee, **R11 is the P1 risk that pricing/refund/settlement economics are unclear**; its closure requires Product/Finance approval and worked examples, not an AI response filter. The PRD does not identify two dated human sign-offs for AI. Do not fabricate interface methods, confidence thresholds, R11 semantics, sign-off names/dates, or a fabricated-output detector. Obtain the canonical contract and written approvals before implementation.

## Evaluation and tests
Before enabling an approved workflow, define a fixed evaluation set, acceptance thresholds, privacy review, human-review procedure, fallback behaviour, and rollback switch. Test malformed/extra output, prompt injection, refusal, timeout, provider outage, confidence boundaries, sensitive-data leakage, and proof that AI output cannot mutate authoritative state. Report provider/version, evaluation evidence, approvals, and unresolved risks.