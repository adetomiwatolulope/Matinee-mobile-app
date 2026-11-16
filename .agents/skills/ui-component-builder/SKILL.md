---
name: ui-component-builder
description: Use for every user-visible screen, component, interaction, styling change, design-system token, or admin interface.
---

# UI Component Builder

## Trigger
Anything a user sees or interacts with: customer mobile screens, cinema/platform admin surfaces, components, forms, seat maps, ticket display, styling, typography, icons, status indicators, or design-system tokens.

## Required checks
1. Read `AGENTS.md` and the relevant Matinee PRD requirements and role/permission rules.
2. Inspect the existing repository and preserve its current mobile framework. Use Next.js/TypeScript for supported web/admin surfaces; do not replace the mobile stack or introduce a new state-management/framework dependency without approval.
3. Do not present future/non-MVP scope as available. Customer-facing web booking, waiting room, WebSockets, offline scanning, food/drink, loyalty, and other listed non-goals require explicit PRD amendment/approval.
4. Keep authoritative business decisions on the server. The UI must never decide seat availability, payment success, refund success, ticket validity, admission, or settlement amounts.
5. Enforce role-appropriate navigation and data visibility. Cinema Admin screens are scoped to active cinema membership; Door Staff cannot access refund, pricing, or user-management actions.

## Semantic-token discipline
- Use semantic tokens for meaning (foreground/background, surface, border, focus, success, warning, danger, disabled, and muted) rather than raw palette values at component call sites.
- Keep token definitions centralized in the repository's existing theme/design-system location. Do not invent a second theme source or scatter one-off values.
- When a required semantic token is missing: (1) search existing tokens and components for an equivalent; (2) check PRD and existing design conventions for intended meaning/contrast; (3) propose a semantic name, meaning, supported theme values, and accessibility rationale; (4) obtain approval before adding it; (5) update all affected states and tests.
- Do not add a design-system dependency unless the current stack cannot meet a documented need and the dependency is approved.

## Status and flag rendering — never color-only
- Seat states must be distinguishable and accessible: available, held by current user, unavailable/held by another user, sold/confirmed, and blocked.
- Pair color with text and/or a meaningful icon/shape. Provide accessible labels/announcements and a clear legend for seat maps.
- Distinguish loading, empty, stale, provider failure, pending, retrying, failed, completed, already-used, and manual-review states where applicable. Do not imply a failed/pending operation is complete.
- Never expose another customer's identity or booking details in seat-map UI.

## Accessibility and responsive floor
- Support a minimum 360px viewport without horizontal scrolling for core tasks (user-requested acceptance floor; validate against the repository's actual device/test matrix).
- Support text scaling, readable contrast, meaningful focus/reading order, accessible names/labels, and adequately sized touch targets.
- Seat maps must remain usable with accessible labels and state descriptions; do not rely only on spatial/color cues.
- Test long cinema/movie names, seat labels, validation errors, loading/failure copy, and enlarged text at narrow widths.
- Respect reduced-motion/platform accessibility conventions where supported by the existing stack.

## Data and interaction discipline
- Fetch and mutate through approved API contracts. Never call Flutterwave or other payment providers directly from the client.
- Display amounts using server-provided/snapshotted values; do not calculate authoritative fees, tax, refund, or settlement amounts in the UI.
- A client hold countdown is informational only; `Hold.expiresAt` and server/database checks are authoritative.
- Ticket display may show QR content only as issued by the server; a screenshot or local state cannot establish admission validity.

## Tests and completion
Test loading/empty/stale/error/pending states, role-based visibility, seat-state labels, accessibility, 360px layout, text scaling, and safe retry UX. Use the repository's actual test scripts; report commands/results and unresolved visual/device coverage. Never claim unrun checks passed.