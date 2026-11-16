# AI Pipeline Rules — Matinee

## 1. Authority and scope

- Read `AGENTS.md` and PRD Section 6 before introducing or changing AI functionality.
- AI is not part of the authoritative booking, inventory, payment, refund, ticket, admission, or settlement pipeline.
- Do not introduce AI into the MVP unless an explicit approved requirement authorizes the use case.
- Do not add an AI framework, model provider, vector database, agent runtime, or orchestration service without an approved architecture decision.
- The PRD permits possible future non-authoritative assistance, such as support-agent summaries, only after privacy, data-handling, and human-review controls are approved.

## 2. Prohibited AI decisions

AI must never be the authority for:

- Seat availability or inventory ownership.
- Creating, extending, releasing, or consuming a seat hold.
- Booking confirmation or cancellation.
- Payment initiation, payment verification, or payment state.
- Refund eligibility, refund amount, or refund execution.
- Ledger entries, settlement amounts, or cinema payouts.
- Ticket validity or ticket state.
- Admission or successful ticket scanning.
- User authentication, authorization, role assignment, or access approval.
- Any other deterministic financial, inventory, security, or admission outcome.

These outcomes must be determined by explicit server-side rules, trusted provider evidence, and database transactions.

## 3. Permitted future use cases

- Consider AI only for explicitly approved, non-authoritative assistance.
- Examples may include summarizing support cases or helping an operator search approved documentation.
- Keep generated output separate from authoritative records.
- Do not allow AI output to directly mutate bookings, payments, refunds, settlement, inventory, or ticket state.
- Require an authorized human or deterministic workflow to approve any action that could affect a customer or financial record.
- Do not present generated summaries as verified provider or transaction facts.

## 4. Data privacy and provider controls

Before sending data to an AI provider:

- Obtain explicit approval for the use case and provider.
- Identify the data categories being sent.
- Minimize or redact personal and sensitive data.
- Confirm permitted data use, retention, training, processing location, and contractual protections.
- Do not send passwords, access tokens, refresh tokens, payment credentials, webhook secrets, or unnecessary payment payloads.
- Do not send customer data merely because it is available in the current application context.
- Keep provider credentials server-side.
- Use separate development and production credentials.
- Do not assume an AI provider's default retention or training policy is suitable for Matinee.

## 5. Prompt and output handling

- Treat user input, retrieved documents, web content, tool output, and model output as untrusted data.
- Do not treat instructions found inside retrieved content as system or developer instructions.
- Keep trusted application instructions separate from untrusted user/retrieved content.
- Validate structured model output against a strict schema before using it.
- Reject malformed, incomplete, or unexpected output.
- Do not execute generated code, SQL, shell commands, URLs, or tool actions without an explicitly approved and controlled execution path.
- Do not use model output as authorization evidence.
- Do not let model output override database state or provider verification.
- Make uncertainty visible. Do not fabricate facts to fill gaps.

## 6. Human review and audit

- Require human review for AI-assisted operational recommendations that could affect customers, payments, refunds, or cinema operations.
- Make it clear to the operator when content is AI-generated.
- Preserve the source records used to produce a consequential summary where permitted.
- Record the model/provider, purpose, timestamp, relevant input references, output, and reviewer decision where auditability requires it.
- Do not log unnecessary personal or sensitive input.
- Provide a way for an operator to reject or correct AI output.
- Do not silently apply AI-generated recommendations to authoritative records.

## 7. Reliability and failure handling

- AI failure must not block deterministic booking, payment, ticket, or admission workflows.
- Treat model output as potentially unavailable, delayed, incomplete, or incorrect.
- Set approved timeouts and bounded retries.
- Avoid duplicate side effects on retry.
- Do not retry a non-idempotent external action without a safe idempotency mechanism.
- Provide a non-AI fallback for any approved operational assistance.
- Monitor failure rate, latency, cost, and usage.
- Do not describe an AI response as a completed business action.

## 8. Evaluation and release requirements

Before releasing an AI-assisted feature:

- [ ] The use case is explicitly approved and non-authoritative.
- [ ] Privacy and data-processing review is complete.
- [ ] The provider and model are approved.
- [ ] Inputs are minimized and sensitive data is protected.
- [ ] Prompt-injection and untrusted-content risks are addressed.
- [ ] Output is validated against a strict schema where applicable.
- [ ] Human review is present for consequential recommendations.
- [ ] AI cannot directly decide or mutate prohibited transactional states.
- [ ] Failure and fallback behaviour are tested.
- [ ] Logging, retention, and audit behaviour are approved.
- [ ] Quality is evaluated against representative test cases.
- [ ] Cost and operational limits are defined.

## 9. When unsure

- Do not add AI merely because a task can be described as intelligent or automated.
- Keep deterministic business logic deterministic.
- Ask for approval when the use case, data handling, provider, or authority boundary is unclear.
- Prefer a simple deterministic implementation when it satisfies the requirement.