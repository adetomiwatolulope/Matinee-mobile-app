# Matinee Design System Rules

## 1. Purpose and Authority

The Matinee Design System is the single source of truth for the visual presentation of the application.

All UI implementation must follow the design tokens exported from Figma and generated into CSS custom properties.

### Source of truth

- Figma design tokens are the source of design decisions.
- `design-tokens.tokens.json` (or the current exported token file) contains the source tokens.
- The generated CSS custom properties file is the implementation reference.
- `scripts/convert-design-tokens.js` generates the CSS variables.

**Never manually edit the generated CSS variables file.**

When a token needs to change:
1. Update the relevant Figma design token.
2. Export the updated token file.
3. Run the token conversion script.
4. Review the generated CSS.
5. Commit the source token and generated output together, following repository conventions.

Do not create competing token definitions.

---

## 2. Non-Negotiable Design Rules

1. Use existing design tokens instead of hardcoded design values.
2. Use semantic colour-role variables in UI components.
3. Never use primitive colour variables directly in application UI.
4. Use the defined typography styles instead of arbitrary font sizes and weights.
5. Use the spacing scale instead of arbitrary spacing values.
6. Use the provided shadow tokens instead of inventing new shadow styles.
7. Preserve consistency across screens and reusable components.
8. Do not introduce new colours, typography styles, spacing values, or effects without an approved design-token change.
9. Do not duplicate design tokens inside individual components.
10. Do not modify generated token files manually.

---

## 3. Colour System

The colour system has two layers:

- **Primitive colours:** foundational colour palettes.
- **Semantic colour roles:** application-facing colours assigned to UI purposes.

### 3.1 Semantic colour usage

Always use semantic colour variables in UI components.

Examples:

```css
/* Correct */
.page {
  background: var(--color-surface);
  color: var(--color-on-surface);
}

.primary-button {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.error-message {
  background: var(--color-error-container);
  color: var(--color-on-error-container);
}
```

### 3.2 Primitive colours are prohibited in UI components

Never use primitive colour variables directly in application UI.

```css
/* Incorrect */
.card {
  background: var(--primitive-neutral-90);
}

.button {
  background: var(--primitive-primary-40);
}
```

Primitive colours exist only as the foundational palette used to generate semantic colour roles.

### 3.3 Available semantic colour roles

Use the following colour roles according to their intended purpose.

| Role | Usage |
|---|---|
| `--color-primary` | Primary brand actions and emphasis |
| `--color-on-primary` | Content displayed on primary backgrounds |
| `--color-primary-container` | Primary-tinted container backgrounds |
| `--color-on-primary-container` | Content displayed in primary containers |
| `--color-secondary` | Secondary emphasis and actions |
| `--color-on-secondary` | Content displayed on secondary backgrounds |
| `--color-secondary-container` | Secondary-tinted containers |
| `--color-on-secondary-container` | Content displayed in secondary containers |
| `--color-tertiary` | Tertiary emphasis |
| `--color-on-tertiary` | Content displayed on tertiary backgrounds |
| `--color-tertiary-container` | Tertiary-tinted containers |
| `--color-on-tertiary-container` | Content displayed in tertiary containers |
| `--color-neutral` | Neutral emphasis |
| `--color-on-neutral` | Content displayed on neutral backgrounds |
| `--color-neutral-container` | Neutral containers |
| `--color-on-neutral-container` | Content displayed in neutral containers |
| `--color-neutral-variant` | Alternative neutral emphasis |
| `--color-on-neutral-variant` | Content displayed on neutral-variant backgrounds |
| `--color-neutral-variant-container` | Alternative neutral containers |
| `--color-on-neutral-variant-container` | Content displayed in neutral-variant containers |
| `--color-surface` | Main application surface |
| `--color-on-surface` | Main surface text and icons |
| `--color-surface-varaint` | Surface variant |
| `--color-on-surface-varaint` | Content on surface variant |
| `--color-surface-container` | Standard surface containers |
| `--color-surface-container-high` | Higher-emphasis surface containers |
| `--color-surface-container-highest` | Highest-emphasis surface containers |
| `--color-surface-container-low` | Lower-emphasis surface containers |
| `--color-surface-container-lowest` | Lowest-emphasis surface containers |
| `--color-surface-container-lowest-2` | Additional surface-container role |
| `--color-surface-tint` | Surface tint |
| `--color-inverse-surface` | Inverse surface |
| `--color-inverse-on-surface` | Content on inverse surface |
| `--color-inverse-on-surface-2` | Additional inverse surface content role |
| `--color-error` | Error states |
| `--color-on-error` | Content on error backgrounds |
| `--color-error-container` | Error containers |
| `--color-on-error-container` | Content in error containers |
| `--color-info` | Informational states |
| `--color-on-info` | Content on information backgrounds |
| `--color-info-container` | Information containers |
| `--color-on-info-container` | Content in information containers |
| `--color-warning` | Warning states |
| `--color-on-warning` | Content on warning backgrounds |
| `--color-warning-container` | Warning containers |
| `--color-on-warning-container` | Content in warning containers |
| `--color-success` | Successful states |
| `--color-on-success` | Content on success backgrounds |
| `--color-success-container` | Success containers |
| `--color-on-success-container` | Content in success containers |

Use the semantic role that matches the component's purpose. Do not choose colours solely because they look visually attractive.

### 3.4 Status colours

Use status colours consistently:

- Error: `--color-error` and its container roles.
- Information: `--color-info` and its container roles.
- Warning: `--color-warning` and its container roles.
- Success: `--color-success` and its container roles.

Do not use success colours to represent warnings or error colours for ordinary informational messages.

### 3.5 Accessibility

- Text and icons must remain distinguishable from their backgrounds.
- Use the corresponding `on-*` role for content placed on a semantic colour background.
- Do not assume that a token pairing automatically meets accessibility contrast requirements.
- Verify contrast for important text, controls, and interactive states.
- Never communicate a status using colour alone. Include a text label, icon, or other distinguishable indicator.

---

## 4. Spacing System

Use the Matinee spacing scale for margins, padding, gaps, and layout spacing.

| Token | Value |
|---|---:|
| `--spacing-no-spacing` | 0px |
| `--spacing-extremely-small-spacing` | 2px |
| `--spacing-extra-extra-samll-spacing` | 4px |
| `--spacing-extra-small-spacing` | 8px |
| `--spacing-medium-spacing` | 12px |
| `--spacing-base-spacing` | 16px |
| `--spacing-small-large-spacing` | 20px |
| `--spacing-large-spacing` | 24px |
| `--spacing-extra-large-spacing` | 32px |
| `--spacing-extra-extra-large-spacing` | 40px |
| `--spacing-very-large-spacing` | 48px |
| `--spacing-extremely-large-spacing` | 64px |

### 4.1 Usage

```css
/* Correct */
.card {
  padding: var(--spacing-base-spacing);
  gap: var(--spacing-medium-spacing);
}

.section {
  margin-bottom: var(--spacing-extra-large-spacing);
}
```

### 4.2 Rules

- Prefer the closest existing spacing token.
- Maintain consistent spacing between related components.
- Use larger spacing to establish separation between distinct content sections.
- Use smaller spacing for closely related elements.
- Avoid arbitrary pixel values when an existing spacing token is appropriate.
- Do not introduce new spacing tokens without approval.

If an exact value is necessary for a technical reason, document why it cannot use an existing token.

---

## 5. Typography System

Matinee uses two font families:

| Font | Purpose |
|---|---|
| Lora | Display typography |
| DM Sans | Headlines, titles, body text, and labels |

### 5.1 Font-family rules

- Use Lora for display styles.
- Use DM Sans for headline, title, body, and label styles.
- Do not introduce another font family without design approval.
- Ensure the required font files are available and loaded by the application.
- Preserve the specified font weights, line heights, and letter spacing.

### 5.2 Typography scale

#### Display

| Style | Family | Size | Weight | Line height | Letter spacing |
|---|---|---:|---:|---:|---:|
| Display Large | Lora | 64px | 600 | 96px | -4px |
| Display Medium | Lora | 48px | 600 | 72px | -3px |
| Display Small | Lora | 32px | 600 | 48px | -2px |

#### Headline

| Style | Family | Size | Weight | Line height | Letter spacing |
|---|---|---:|---:|---:|---:|
| Headline Large | DM Sans | 32px | 500 | 48px | -1.55px |
| Headline Medium | DM Sans | 28px | 500 | 42px | -1.35px |
| Headline Small | DM Sans | 24px | 500 | 36px | -1px |

#### Title

| Style | Family | Size | Weight | Line height | Letter spacing |
|---|---|---:|---:|---:|---:|
| Title Large | DM Sans | 22px | 500 | 33px | -1px |
| Title Medium | DM Sans | 16px | 600 | 24px | -0.85px |
| Title Small | DM Sans | 14px | 500 | 21px | -0.75px |

#### Body

| Style | Family | Size | Weight | Line height | Letter spacing |
|---|---|---:|---:|---:|---:|
| Body Large | DM Sans | 16px | 500 | 24px | -0.85px |
| Body Medium | DM Sans | 14px | 500 | 21px | -0.75px |
| Body Small | DM Sans | 12px | 500 | 20px | -0.75px |

#### Label

| Style | Family | Size | Weight | Line height | Letter spacing |
|---|---|---:|---:|---:|---:|
| Label Large | DM Sans | 14px | 400 | 21px | -0.9px |
| Label Medium | DM Sans | 12px | 400 | 20px | -0.75px |
| Label Small | DM Sans | 11px | 500 | 19px | -0.8px |

### 5.3 Typography implementation

Use the typography custom properties rather than recreating the values manually.

Example:

```css
.page-heading {
  font-family: var(--typography-display-small-font-family);
  font-size: var(--typography-display-small-font-size);
  font-weight: var(--typography-display-small-font-weight);
  line-height: var(--typography-display-small-line-height);
  letter-spacing: var(--typography-display-small-letter-spacing);
}
```

### 5.4 Typography rules

- Use display styles for prominent display-level content.
- Use headline styles for section and page headings.
- Use title styles for component and content titles.
- Use body styles for readable content.
- Use label styles for compact supporting text and interface labels.
- Do not use font size alone to establish hierarchy. Consider weight, spacing, and semantic HTML structure.
- Avoid unnecessary text transformations, underlining, and decorative styling.
- Do not shrink text below the defined scale without an approved accessibility or platform-specific reason.

---

## 6. Elevation and Shadows

Use the provided shadow tokens for visual elevation.

| Token | Value | Intended character |
|---|---|---|
| `--effect-hard-shadow` | `4px 6px 8px 0px #00000052` | Strong elevation |
| `--effect-medium-shadow` | `2px 4px 6px 0px #00000047` | Medium elevation |
| `--effect-soft-shadow` | `2px 2px 20px 0px #0000001f` | Subtle elevation |

Example:

```css
.dialog {
  box-shadow: var(--effect-hard-shadow);
}

.card {
  box-shadow: var(--effect-soft-shadow);
}
```

Rules:

- Prefer the soft shadow for subtle separation.
- Use medium or hard shadows only when stronger elevation is needed.
- Do not add arbitrary shadow values to individual components.
- Do not use shadows as a replacement for clear layout hierarchy.
- Avoid stacking multiple shadows without a documented design requirement.

---

## 7. Component Design Rules

All reusable components must use the Matinee design tokens.

### Buttons

- Use semantic colour roles.
- Maintain consistent typography and spacing.
- Provide clear visual distinction between interactive and disabled states.
- Make loading and submission states clear.
- Prevent repeated submissions while an operation is in progress.

### Cards and containers

- Use surface roles for backgrounds.
- Use the spacing scale for padding and gaps.
- Use approved shadow tokens where elevation is required.
- Maintain consistent internal alignment.

### Forms and inputs

- Use consistent typography and spacing.
- Make labels and validation messages readable.
- Use error roles for invalid input states.
- Preserve clear focus and disabled states.
- Do not rely on placeholder text as the only field label.

### Dialogs and overlays

- Use appropriate surface roles.
- Use the approved elevation tokens.
- Preserve readable content and clear actions.
- Ensure keyboard and assistive-technology accessibility.

### Navigation

- Use semantic colour roles for active, inactive, and selected states.
- Maintain consistent spacing and typography.
- Make the current location or selected destination clear.

These component rules define visual consistency. They do not authorize new product features or alter application workflows.

---

## 8. Matinee Application Experience

The design system must support the Matinee product experience without changing product requirements.

For cinema, movie, showtime, seat-selection, booking, and payment interfaces:

- Make important information easy to scan.
- Use typography hierarchy to distinguish titles, supporting information, and metadata.
- Make selection states visually distinguishable.
- Communicate unavailable, selected, reserved, and confirmed states clearly where those states exist in the approved product workflow.
- Make prices and payment summaries easy to understand.
- Keep primary actions visually identifiable.
- Use error, warning, information, and success roles according to their actual meaning.

Do not invent new booking states, payment states, or product behaviour merely to satisfy a visual design preference.

---

## 9. Responsive Design

- Preserve the design system's typography and spacing hierarchy across screen sizes.
- Adapt layouts to available space without introducing unrelated visual styles.
- Prevent text overflow and clipped interactive controls.
- Maintain readable content widths.
- Ensure touch targets are practical and accessible.
- Do not assume that desktop layouts can simply be scaled down to mobile.
- Do not introduce new token values solely to solve a responsive layout problem when existing tokens and layout techniques are sufficient.

Responsive breakpoints and platform-specific layout values must follow established project conventions unless explicitly approved.

---

## 10. Accessibility Requirements

Every UI implementation must consider:

- Sufficient colour contrast.
- Visible keyboard focus.
- Readable text sizing.
- Semantic heading hierarchy.
- Accessible form labels.
- Meaningful error messages.
- Clear disabled and loading states.
- Screen-reader-friendly names for icon-only controls.
- Touch target usability.
- Status communication that does not depend on colour alone.

Accessibility is a requirement, not a visual enhancement to be postponed.

---

## 11. Prohibited Practices

The following are not permitted without explicit design-system approval:

1. Using primitive colour variables directly in UI.
2. Hardcoding colours when semantic tokens exist.
3. Introducing unrelated font families.
4. Creating arbitrary typography scales.
5. Creating arbitrary spacing values.
6. Adding custom shadows when an approved effect token exists.
7. Duplicating tokens inside components.
8. Manually editing generated token CSS.
9. Creating a second, competing theme.
10. Introducing new design styles because they are fashionable or visually appealing.
11. Replacing the established design system with a UI framework's default theme.
12. Using colour alone to communicate status.
13. Changing the product's workflows to accommodate a visual implementation.

---

## 12. Handling Missing Tokens

If a design requirement cannot be implemented using the available tokens:

1. Inspect the existing design tokens and reusable components.
2. Check whether an equivalent semantic role or typography style already exists.
3. Prefer an existing token if it is semantically appropriate.
4. Do not use an unrelated token merely because its value looks similar.
5. Do not invent a new token silently.
6. Document the missing requirement and request design approval.
7. Update Figma tokens and regenerate the CSS when approval is granted.

If a token is missing, treat it as an unresolved design-system requirement rather than an invitation to invent a value.

---

## 13. Token Naming and Known Export Issues

The generated token file currently contains these spellings:

- `--spacing-extra-extra-samll-spacing`
- `--color-surface-varaint`
- `--color-on-surface-varaint`

Use the exact generated names when referencing these variables.

Do not silently rename them in application components.

If the spelling should be corrected:
1. Correct the source token or conversion mapping.
2. Regenerate the CSS.
3. Update all references consistently.
4. Review the change for compatibility.

The generated output also contains some similarly named roles and values. Do not assume they are interchangeable simply because their current values are equal.

---

## 14. Design-System Change Process

Any proposed design-system change must:

1. Identify the design problem.
2. Check whether existing tokens already solve it.
3. Explain why the current system is insufficient.
4. Obtain approval from the appropriate design owner.
5. Update the Figma source tokens.
6. Regenerate the CSS custom properties.
7. Update affected components.
8. Verify relevant screens and responsive layouts.
9. Check accessibility and contrast.
10. Commit the source and generated changes together.

Do not make unilateral changes to the design system.

---

## 15. Implementation Checklist

Before considering a UI task complete, verify:

- [ ] Semantic colour variables are used.
- [ ] No primitive colour variables are used directly in UI.
- [ ] Typography follows the defined scale.
- [ ] Spacing follows the approved scale.
- [ ] Shadows use the available effect tokens.
- [ ] Reusable components follow established patterns.
- [ ] Responsive layouts remain usable.
- [ ] Interactive states are distinguishable.
- [ ] Accessibility requirements have been considered.
- [ ] No unapproved tokens or styles were introduced.
- [ ] Generated token files were not manually modified.
- [ ] The UI remains consistent with the Matinee product requirements.

**Final rule:** If a design decision is not supported by the existing Matinee tokens or approved product designs, do not invent it. Identify the gap and request clarification or approval.