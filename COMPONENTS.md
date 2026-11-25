# COMPONENTS.md — Matinee mobile components

All reusable UI lives in `Frontend/components/ui.jsx`. Components consume semantic tokens from `Frontend/designTokens.js` and `Frontend/theme/ThemeContext.jsx`; call sites should not use raw palette values.

The system light/dark setting controls theme. There is no manual theme toggle.

## Design rules

- Use semantic color, spacing, typography, motion, and effect tokens.
- Pair status with text or a meaningful icon; never rely on color alone.
- Respect reduced motion.
- Keep touch targets accessible and labels meaningful.
- Keep authoritative business decisions on the server. UI state is advisory only.
- Use `@expo/vector-icons/Ionicons` directly; do not import the full icon set.

## Component inventory

| Component | Purpose | States/variants |
|---|---|---|
| `Text` | Typography wrapper | Typography variant, semantic tone, alignment |
| `Button` / `PrimaryButton` | Action control | Primary/secondary, loading, disabled, full width |
| `Card` | Grouped surface container | Single surface state |
| `MovieCard` | Film poster card | Optional play badge, poster/backdrop fallback, subtitle |
| `Input` / `FormField` | Labeled text field | Helper text, validation error, secure entry, disabled |
| `Chip` | Compact selectable tag | Selected, unselected, disabled |
| `Badge` | Small status label | Neutral, primary, success, warning, error |
| `BottomSheet` | Modal bottom surface | Hidden/visible, optional action |
| `Skeleton` / `SkeletonCard` | Loading placeholder | Animated or reduced-motion static |
| `Toast` | Non-blocking alert | Info, success, error, optional action/dismiss |
| `EmptyState` / `StatePanel` | Empty, error, overload, or no-results state | Optional retry action |
| `SeatMap` | Virtualized seat grid | Available, selected, held, sold, wheelchair |
| `PosterImage` | Cached image with fallback | Decorative or labeled, shared transition tag |
| `PlayBadge` | Visual-only play affordance | Fixed position over artwork |
| `SearchIcon` | Leading search affordance | Decorative |
| `BackButton` | Accessible icon button | Pressed feedback, custom accessibility label |
| `BrandHeader` | MATINEE/title/subtitle header | Optional brand label, optional back button |
| `Screen` | Safe-area screen shell | Forward/back transition, content style |

## Header and navigation

`BrandHeader` can render `BackButton` inside the MATINEE row. On Discover, the icon:

- returns to the dashboard,
- is vertically aligned with `MATINEE`,
- starts at the left edge of the card/search grid with the visible glyph aligned to that edge,
- has a full touch target and `Back to dashboard` accessibility label.

## Seat map contract

```js
{
  id: 'A1',
  label: 'A1',
  status: 'available | selected | held | sold | wheelchair',
  wheelchairAccessible: false,
}
```

`SeatMap` uses `FlatList` windowing and stable keys. Its gallery fixture renders 300 seats. It never exposes another customer's identity or booking data.

## Current screens

- `AuthScreen`, `VerifyScreen`, `OnboardingScreen` — identity flows.
- `DashboardScreen` — dashboard cards and hidden gallery trigger.
- `DiscoveryScreen` — now-playing grid, search, overload state, back icon.
- `MovieDetailsScreen` — details with shared poster transition and overload state.
- `PaymentScreen` — safe setup-pending checkout surface; no real payment activation.
- `AboutScreen` — TMDB credits and notices.
- `ComponentGalleryScreen` — hidden Requirement 3 style guide, opened by long-pressing the dashboard greeting.

## Not implemented

No customer-facing web components exist. Admin surfaces are not initialized. No component package was published; that was a stretch goal only.
