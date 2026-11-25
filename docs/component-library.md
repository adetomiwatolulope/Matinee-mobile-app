# Matinee component library

Status: Requirement 3 living documentation.

All components live in `Frontend/components/ui.jsx` and consume `theme.colors`, `theme.spacing`, `theme.typography`, `theme.metrics`, `theme.motion`, and `theme.effects` from the generated design tokens. Components do not use raw visual values.

## Components

| Component | Purpose | Variants/states | Key props |
| --- | --- | --- | --- |
| `Button` | Primary action control; exported as `PrimaryButton` for existing screens. | `primary`, `secondary`; `loading`, `disabled`, `fullWidth` | `label`, `onPress`, `variant`, `loading`, `disabled`, `fullWidth`, `accessibilityLabel` |
| `Text` | Typography scale wrapper. | All `theme.typography` variants; semantic tone and alignment | `variant`, `tone`, `align`, `style`, `children` |
| `Card` | Surface container for grouped content. | Single surface state | `children`, `style` |
| `MovieCard` | Poster card for a film. | Default and `showPlayBadge={false}`; uses `PosterImage` and `PlayBadge` | `movie`, `onPress`, `subtitle`, `showPlayBadge`, `style` |
| `Input` | Labeled text field with validation display. | Default, `error`, `helper`, `secureTextEntry`, `disabled` | `label`, `value`, `onChangeText`, `placeholder`, `error`, `helper`, `secureTextEntry`, `disabled`, `accessibilityLabel` |
| `Chip` | Compact selectable filter or tag. | Unselected, selected, disabled | `label`, `selected`, `disabled`, `onPress` |
| `Badge` | Small status label. | `neutral`, `primary`, `success`, `warning`, `error` | `label`, `tone` |
| `BottomSheet` | Modal bottom surface. | Hidden, visible, optional action | `visible`, `title`, `children`, `onClose`, `actionLabel`, `onAction` |
| `Skeleton` | Loading placeholder with reduced-motion support. | Custom width, height, radius; animated or static | `width`, `height`, `borderRadius` |
| `Toast` | Non-blocking alert with optional action. | `info`, `success`, `error`; optional dismiss and action | `visible`, `message`, `tone`, `actionLabel`, `onAction`, `onDismiss` |
| `EmptyState` | Empty or failure state panel; exported as `StatePanel` for existing screens. | Without action, with action | `title`, `message`, `actionLabel`, `onAction` |
| `SeatMap` | Virtualized seat inventory grid. | `available`, `selected`, `held`, `sold`, `wheelchair` | `seats`, `selectedSeatIds`, `onSeatPress`, `columns` |

## Seat map contract

`SeatMap` accepts seat objects shaped as:

```js
{
  id: 'A1',
  label: 'A1',
  status: 'available | selected | held | sold | wheelchair',
  wheelchairAccessible: false,
}
```

Client seat state is advisory. The server and PostgreSQL transaction remain authoritative for holds, bookings, and seat availability. `SeatMap` never shows another customer's identity or booking details.

The gallery fixture renders 300 seats (20 rows by 15 columns) through `FlatList` with batched rendering, windowing, and stable keys.

## Hidden component gallery

`ComponentGalleryScreen` is hidden from normal navigation. Open it by long-pressing the dashboard greeting header. It shows every component in every documented state, including the 300-seat map.

## Stretch item

Publishing a component as a standalone npm package with its own README is marked as a stretch goal and is not implemented.
