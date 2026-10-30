---
inclusion: fileMatch
fileMatchPattern: "src/**/*.tsx"
---

# Strata: UI, Material Design 3 and Windmorph

## Component order

1. **`@windmorph/react`** for every standard M3 component (Button, IconButton, Card, Dialog,
   TextField, Select, Autocomplete, Checkbox, Radio/RadioGroup, Switch, chips, Menu, List,
   Tabs, ButtonGroup, NavigationBar, NavigationRail, TopAppBar, SideSheet, BottomSheet,
   Snackbar, Tooltip, Badge, progress indicators, LoadingIndicator, date/time pickers, Fab,
   FabMenu, SearchBar, Divider). Look at the package typings before building anything.
2. **`@windmorph/react-pro`** for non-M3 components (Avatar, AvatarGroup, Skeleton, EmptyState,
   ListDetailLayout, Accordion, Alert, FileTrigger, Tag, SkipLink, Link, ...).
3. **`src/components/ui`** for what neither has (DataTable, DataGrid, tree view, calendar grid,
   condition builder, colour/icon picker, breadcrumbs). Build them as future windmorph-pro
   components: full API, controlled and uncontrolled, Windmorph tokens, accessible.
4. Logic-only libraries (React Aria, TanStack Virtual, xyflow + ELK, visx) underneath. Never a
   library's own look.

## Theming and styling

- Tokens come from `@windmorph/react/styles.css` then `@windmorph/react-pro/styles.css`, imported
  once in `globals.css`. Theme via Windmorph's `ThemeProvider` (`useTheme()` for mode).
- **Only semantic token classes** (`bg-surface`, `text-on-surface-variant`, `border-outline`, ...).
  No hex, rgb, `hsl(var(--x))`, or raw Tailwind palette colours (`emerald-500`...). Colours that
  users pick (e.g. a team colour) are data, applied through CSS variables.
- **Type:** M3 type roles as utilities (`text-body-medium`, `text-title-large`...) on semantic
  tags. No `text-[13px]`, no `text-sm`.
- No magic sizes (`h-[calc(...)]`); use layout components and the Tailwind scale.

## Layout and devices

- One shell with **adaptive navigation**: NavigationBar on phone (< 600px), a collapsed
  NavigationRail (icons with labels) from 600px, desktop included. The rail sits on `surface-container`,
  the page on `surface`. **One top app bar per page**, owned
  by the shell's page header.
- Use **canonical layouts**: list-detail (`ListDetailLayout`) for people, approvals, rate cards and
  settings; supporting pane for time off; full-width for calendar, capacity grid and org chart.
- Each screen follows the device table in `docs/product-decisions.md` (Devices). Screens that are
  desktop/tablet only show a summary and an "open on a larger screen" message on phones.

## Behaviour

- Every route has `loading.tsx` (Skeleton) and `error.tsx` (EmptyState with retry); empty lists
  use EmptyState.
- Forms: zod schema in `features/<module>/schemas.ts`, Server Action, field errors on inputs via
  `errorText`, Snackbar for success. Complex forms use `react-hook-form` through the shared
  Windmorph input adapters.
- Feedback through the shared Snackbar host; never `window.alert`.
- `IconButton` defaults to `filled` in Windmorph; pass `variant="standard"` for overflow menus,
  back arrows and row or toolbar actions (M3), and choose filled or tonal only for emphasis.
- Database refusals carry the `errors.*` message key as their `hint`; actions show that key.
- Motion from `motion/react`, M3 durations, always respecting reduced motion.

## Accessibility (WCAG 2.2 AA)

Semantic HTML, keyboard access for everything, visible focus, labels on every input and icon
button, no click handlers on non-interactive elements, focus trapped in dialogs and sheets,
announcements for async results. Drag and drop always has a keyboard alternative.
