# Matinee UI design specification

Status: approved design-for-build document for Requirement 2. It is the working design source in place of a Figma file, using the generated design tokens as the visual source of truth.

## Source of truth

- Visual source: `design-tokens.css`, `Frontend/designTokens.js`, and `design-system.md`.
- UI must use semantic roles from `designTokens.js`; no one-off colors, spacing numbers, radii, or type sizes.
- The generated CSS token file is not edited by hand.
- The generated token set has no dedicated border-radius role; component radii use existing spacing tokens until an approved radius token is exported.
- The app follows the device colour scheme. Light and dark role maps are active through `ThemeContext`.
- Figma is not available for this pass. This document defines layout, hierarchy, states, motion, accessibility, and token usage before implementation.

## Five-app visual study

Screenshot references are linked to the developers' public App Store listings and screenshot archives. These are inspiration only; Matinee will not copy proprietary artwork, icons, or copy.

| App | Screenshot reference | What to take from it | One-line why it works |
|---|---|---|---|
| Airbnb | [App Store](https://apps.apple.com/us/app/airbnb/id401626263) · [screenshot set](https://appscreens.store/app/airbnb) | Card-based discovery, clear badges, dense information made scannable. | It makes a large catalog feel curated and trustworthy at a glance. |
| Spotify | [App Store](https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580) · [screenshot set](https://screenies.app/apps/324684580-spotify-music-and-podcasts) | Strong cover art, unmistakable current-selection state, confident typography. | It turns browsing into a fast, visually memorable routine. |
| Netflix | [App Store](https://apps.apple.com/us/app/netflix/id363590051) · [screenshot set](https://screenies.app/apps/363590051-netflix) | Cinematic hero, compact metadata, horizontal content rows. | It puts the next thing to watch front and center without clutter. |
| Uber | [App Store](https://apps.apple.com/us/app/uber-rides-eats-hotels/id368677368) · [screenshot set](https://appscreens.store/app/uber-request-a-ride) | High-contrast primary action, progressive disclosure, minimal confirmation screens. | It reduces a complex transaction to a few obvious decisions. |
| Duolingo | [App Store](https://apps.apple.com/us/app/duolingo-learn-languages/id570060128) · [screenshot set](https://www.screenspo.com/apps/duolingo) | Friendly empty states, generous feedback, playful but controlled motion. | It keeps a task-oriented flow warm without sacrificing clarity. |

Design translation for Matinee:

- From Airbnb: use structured cards for films and cinemas; keep badges short and meaningful.
- From Spotify: use poster art as the dominant discovery element and keep selection state obvious.
- From Netflix: use a cinematic discovery hero and horizontal rows only where content is genuinely browsable.
- From Uber: one primary action per screen; confirmations are calm and explicit.
- From Duolingo: make verification success and empty states feel encouraging, not sterile.

## Brand expression

- Emotion: premium but approachable, cinematic, calm, precise.
- Layout: generous vertical rhythm, compact data where appropriate, large readable titles.
- Shape: use existing token-based radii only; keep corner language consistent.
- Elevation: use `softShadow` for cards, `mediumShadow` for active sheets, `hardShadow` only for critical overlays.
- Motion: purposeful and short; never decorative enough to delay a decision.

## Semantic theme map

### Light

Use the existing `designTokens.js` semantic roles directly:

- Page: `surface` / `onSurface`
- Cards: `surfaceContainerLowest` / `onSurface`
- Muted surfaces: `surfaceContainer`, `surfaceVariant`
- Primary action: `primary` / `onPrimary`
- Secondary action: `secondary` / `onSecondary`
- Error: `error` / `onError`
- Success: `success` / `onSuccess`
- Warning: `warning` / `onWarning`
- Border: `outline` / `outlineVariant` (mapped from existing neutral and surface tokens)

### Dark

The dark role map below is rendered when the device reports a dark colour scheme. There is no separate in-app toggle; the device setting is authoritative.

| Role | Dark token source |
|---|---|
| `background` / `surface` | `inverseSurface` |
| `onBackground` / `onSurface` | `inverseOnSurface` |
| `surfaceContainer` | `onSurfaceVariant` |
| `surfaceContainerHigh` | `onSurface` |
| `onSurfaceVariant` | `surfaceContainerHighest` |
| `outline` | `surfaceContainerHighest` |
| `outlineVariant` | `onSurfaceVariant` |
| `primary` / `onPrimary` | `primary` / `onPrimary` |
| `primaryContainer` / `onPrimaryContainer` | `secondary` / `onSecondary` |
| `secondaryContainer` / `onSecondaryContainer` | `onSurfaceVariant` / `inverseOnSurface` |
| `error` / `onError` | `error` / `onError` |
| `errorContainer` / `onErrorContainer` | `error` / `onError` |
| `successContainer` / `onSuccessContainer` | `onSurfaceVariant` / `inverseOnSurface` |
| `warningContainer` / `onWarningContainer` | `onSurfaceVariant` / `inverseOnSurface` |

Accessibility rule: text/background pairs must meet at least 4.5:1 contrast; large display type must meet at least 3:1. Any role pair that fails gets a documented semantic override before use.

Documented overrides:
- Status text uses `onSurfaceVariant` instead of `success` or `error`; `success` on light surfaces is 2.19:1 and `error` on dark surfaces is 1.97:1. Status remains explicit in text and announced roles.
- Positive message text uses `onSurfaceVariant` on `successContainer` (7.54:1 light, 6.77:1 dark) instead of `onSuccessContainer` (3.54:1 light).
- Accent, link, and rating text uses `onSurfaceVariant` instead of `primary`; `primary` remains a fill colour with `onPrimary` (16.1:1). Dark `primary` on `surface` is 1.27:1.

## Screens

### Boot and session restore

- Keep a branded splash with logo mark, app name, and indeterminate motion.
- Include a friendly loading label.
- On restore success, cross-fade into the dashboard.
- On restore failure, cross-fade into auth; do not show an error for a normal signed-out state.

### Auth

- Layout: centered content column with brand lockup, headline, form, and support actions.
- Fields: always-visible labels, `titleMedium` input text, token spacing between fields, token border radius.
- Security: password visibility toggle has an explicit accessibility label and state.
- Primary button: full-width, one primary action, disabled state uses semantic disabled tokens.
- Google sign-in: divider and Google icon button are shown as disabled with `Coming soon`; no OAuth flow is available.
- Error presentation: inline summary above the submit button; field-specific message below the field.
- Motion: button press uses haptic feedback and subtle scale; error summary fades in.

### Onboarding

- Layout: contextual illustration or image area, short headline, one sentence of supporting copy, one primary action.
- Progress: use paged indicators with accessibility labels such as `Step 1 of 3`.
- Do not ask for unnecessary personal data.
- Haptics on step completion and final acknowledgement.
- Motion: horizontal directional slide consistent with forward/back intent.

### Verify email

- Layout: title, code input, countdown/status, resend action, support action.
- Code input: six separate boxes with `accessibilityLabel` and `accessibilityHint`.
- States:
  - editing: neutral border, keyboard-focused box emphasized with primary token.
  - verifying: skeletonized button or inline spinner; prevent duplicate submits.
  - success: success icon, confirmation copy, haptic success, then dashboard.
  - invalid/expired/too many attempts: error copy with recovery action.
  - resend cooldown: display authoritative backend status; countdown is display-only.

### Dashboard

- Layout: greeting/header, primary discovery entry, checkout and payment status entry, account status card.
- No unsupported feature cards; anything not implemented is either absent or explicitly labeled as a future area without interactive affordance.
- Account verification state is shown once and clearly.
- Motion: reorder/appear only for real state changes; no looping decorative animation.

### Discovery

- Entry points: Now Playing and Search, both backed by the authenticated backend proxy routes.
- The search field has a leading decorative Ionicons search icon beside the `Search films` text; the field keeps its `Search films` accessibility label.
- Structure:
   - hero card for a featured film when data exists.
   - Netflix-inspired vertical "Now Playing" grid with two evenly aligned movie cards per row on all phone widths.
   - Ionicons play badge on movie artwork; tapping the movie opens details because playback is not an MVP workflow.
  - search field and result grid.
  - attribution footer with the TMDB notice returned by the backend.
- Header: back icon at the top-left, vertically aligned with the `MATINEE` label and horizontally aligned with the card grid, returning to the dashboard.
- Loading: poster-shaped skeleton cards and hero skeleton; no unbranded spinner-only page.
- Empty: "No films available yet" with a quiet icon, explanatory copy, and retry only when retry is meaningful.
- Error: "We couldn't load films" with `Try again`; preserve stable layout and do not blank the screen.
- Overload: for `429` or `503`, show "Too many people are browsing" with "Matinee is busy right now. Please wait a moment and try again." and `Try again`.
- Stale: show cached results with a compact "Showing recently saved results" notice when the backend reports stale data.
- Disabled/unapproved catalog: show a neutral "Catalog unavailable" state; do not imply that films are unavailable forever.
- Images: use `expo-image` with cached progressive placeholders; poster aspect ratio is fixed by token-derived layout constants; no layout jump on load.
- Lists: `FlatList` with stable keys, `getItemLayout` where dimensions are fixed, and windowing intact.
- Responsive: one column on compact phones; wider cards and additional columns only when width tokens permit.

### Movie details

- Layout: backdrop hero, poster overlap, title, metadata, synopsis, and one primary action.
- Primary action must not claim ticket purchasing or showtimes unless implemented; current MVP UI can expose "Details" only.
- Metadata: year, rating, runtime, genres; omit missing values rather than showing placeholders.
- Attribution: visible TMDB notice in the footer.
- Loading: hero/poster/text skeletons with matching proportions.
- Error/empty: return to discovery with an explicit message.
- Overload: for `429` or `503`, show the same busy message and retry action used by discovery.
- Motion: shared-element-style transition from poster card to detail poster where Reanimated supports it; disable for reduce-motion users.

### Checkout and payments

- Entry point: dashboard card that opens a server-authorised checkout and payment status surface.
- Setup state: show `Setup pending`; do not present payment initiation as available while financial and late-payment decisions are open.
- Order summary: display labels only until the server supplies snapshotted amounts; never calculate fees, taxes, provider charges, or totals in the client.
- Status: payment, booking, and ticket status are shown as unavailable until backed by server responses; returning from a checkout is never treated as proof of payment.
- Disabled primary action must include an accessibility label explaining why payment is unavailable.

## Motion and feedback

- Use Reanimated for screen transitions, list entry, and shared poster transitions.
- Use `expo-haptics` for success, warning, and primary confirmation moments only.
- Respect reduced-motion accessibility setting: replace movement with fades or immediate state changes.
- Never animate hold countdowns as authoritative state; they are display-only.

## Accessibility

- Every interactive element has an accessibility role, label, and state where applicable.
- All buttons and tappable rows have at least a 44x44 touch target.
- Text uses `allowFontScaling`; layouts tolerate large text without clipping.
- Images that convey information have labels; decorative images are hidden from accessibility.
- Form errors are associated with their fields and announced through the summary.
- Focus order follows visual reading order.
- Contrast is verified in the forced light theme.

## Responsive behavior

- Test on small and large phone widths.
- Use token spacing and flex layouts; no hard-coded device dimensions in style values.
- On compact widths, reduce decorative imagery before reducing text size.
- On large widths, increase content max width rather than stretching lines of text indefinitely.
- Safe areas come from `react-native-safe-area-context`.

## Implementation plan

1. Add `expo-image`, `expo-haptics`, `react-native-reanimated`, and `react-native-safe-area-context`.
2. Add Reanimated Babel plugin and wrap the root in `SafeAreaProvider`.
3. Add a theme context that exposes the light and dark semantic role objects derived only from `designTokens.js` and follows the device colour scheme.
4. Split `App.js` into screen and reusable UI modules without changing backend/auth behavior.
5. Implement discovery states and movie details against the backend proxy routes only.
6. Apply motion, haptics, responsive rules, and accessibility across all existing screens.
7. Verify with Android bundle, tests, and manual review of light/dark and small/large layouts.

## Explicit non-goals

- No Figma file will be produced in this pass.
- No separate in-app dark-mode toggle is included; the device colour scheme controls the active theme.
- No booking, seat map, payment, ticket, cinema admin, or door-scan UI is added.
- No direct TMDB calls from the mobile app.
- No raw color values or primitive-token styling in UI code.
- No claim that the catalog is live until the TMDB commercial-use and key blockers are closed.
