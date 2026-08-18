# Design Document: M3 Expressive Components Audit

## Overview

This design describes the concrete changes needed to bring the `@vkieu/mui` component library into full compliance with Material Design 3 Expressive token specifications. The library already exists and functions correctly — this is a targeted audit-and-fix pass, not a rewrite.

The audit covers **10 component groups** (Buttons, Selection Controls, Chips, Cards, Select, Tabs, Navigation, Menu, Snackbar, and Remaining) against five dimensions:

1. **Dimensional tokens** (height, padding, icon sizes, gap)
2. **Color tokens** (background, text, border mapped to theme.css custom properties)
3. **Typography roles** (font-size, line-height, weight, letter-spacing)
4. **Elevation strategy** (tonal vs shadow, levels 0–5)
5. **State layers, motion, and consumer-friendliness**

All fixes use Tailwind CSS v4 canonical utility classes. Where a standard utility exists (e.g., `h-10`, `rounded-full`, `px-6`), it is preferred over arbitrary values.

---

## Architecture

### Audit-and-Fix Methodology

```
┌─────────────────────────────────────────────────────┐
│  For each component group:                          │
│  1. Read current CVA variants + class lists         │
│  2. Compare against M3 Expressive spec tokens       │
│  3. Identify delta (missing/wrong classes)          │
│  4. Apply fix in-place — same file, same API        │
│  5. Verify no forced position/width on root         │
│  6. Run existing tests / visual review              │
└─────────────────────────────────────────────────────┘
```

### File Organization (unchanged)

```
mui/src/
├── buttons/          # button, fab, extended-fab, split-button, button-group, icon-button
├── indicators/       # circular-progress, linear-progress, loading-indicator
├── navigation/       # navigation-bar, navigation-rail
├── theme.css         # M3 tokens, keyframes, animation utilities
├── card.tsx
├── chip.tsx
├── checkbox.tsx
├── radio.tsx
├── switch.tsx
├── select.tsx
├── tabs.tsx
├── menu.tsx
├── context-menu.tsx
├── snackbar.tsx
├── slider.tsx
├── badge.tsx
├── tooltip.tsx
├── list.tsx
├── divider.tsx
├── search.tsx
├── app-bar.tsx
└── ...
```

No new files are created. All changes are in-place edits to existing components and, if needed, additions to `theme.css` for missing tokens.

---

## Components and Interfaces

### Token Mapping Tables

Each table maps the M3 Expressive spec token to the Tailwind v4 canonical class (or CSS custom property reference) that should appear in the component source.

#### 1. Button Components

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Container height (default) | 40dp | `h-10` |
| Horizontal padding (no icon) | 24dp | `px-6` |
| Horizontal padding (with leading icon) | 16dp left / 24dp right | `pl-4 pr-6` |
| Shape | corner-full | `rounded-full` |
| Icon size | 18dp | `[&_svg]:size-[18px]` |
| Icon-label gap | 8dp | `gap-2` |
| Typography | Label Large 14/20/500/0.1 | `text-[14px] font-medium leading-5 tracking-[0.1px]` |
| Filled bg | primary | `bg-primary` |
| Filled text | on-primary | `text-primary-foreground` |
| Filled hover elevation | Level 1 shadow | `hover:shadow-[0_1px_3px_var(--elevation-1)]` |
| Outlined border | 1px outline | `border border-outline` |
| Outlined text | primary | `text-primary` |
| Tonal bg | secondary-container | `bg-secondary-container` |
| Tonal text | on-secondary-container | `text-secondary-container-foreground` |
| Text variant | transparent | `bg-transparent text-primary` |
| Elevated bg | surface-container-low | `bg-surface-container-low` |
| Elevated shadow | Level 1 | `shadow-[0_1px_3px_var(--elevation-1)]` |
| Press shape morph | radius reduces | `active:rounded-xl` (from `rounded-full`) |
| Morph transition | 100ms ease-out | `transition-[border-radius,box-shadow] duration-100 ease-out` |

**Current gap:** Button default size is `h-9` (36dp) in the `s` size variant; the M3 default is 40dp. The `m` size is correct at `h-10`. Fix: change the default variant from `s` to `m`, or adjust `s` to `h-10`.

#### FAB

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Small | 48dp | `size-12` |
| Medium | 56dp | `size-14` |
| Large | 96dp | `size-24` |
| Extended | 56dp height, auto width | `h-14 w-auto` |
| Shape (rest) | corner-large (16dp) | `rounded-2xl` |
| Shape (press morph) | reduced | `active:rounded-xl` |
| Elevation rest | Level 3 | `shadow-[0_4px_8px_var(--elevation-3),0_1px_3px_var(--elevation-3)]` |
| Elevation hover | Level 4 | `hover:shadow-[0_6px_12px_var(--elevation-4),0_2px_4px_var(--elevation-4)]` |

**Current status:** FAB is largely compliant. The small size (`m`) maps to 48dp (`size-12`) ✓.

#### 2. Selection Controls

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Checkbox visual | 18dp × 18dp | `size-[18px]` |
| Checkbox corner | 2dp | `rounded-sm` (4px) → need `rounded-[2px]` |
| State layer | 40dp circular | `w-10 h-10 rounded-full` |
| Touch target | 48dp min | `min-w-12 min-h-12` |
| Radio outer | 20dp, 2dp border | `size-5 border-2` |
| Radio inner dot | 10dp | `size-2.5` |
| Switch track | 52dp × 32dp | `w-13 h-8 rounded-full` |
| Switch handle (unselected) | 16dp | inline style `16px` |
| Switch handle (selected) | 24dp | inline style `24px` |
| Switch handle (pressed) | 28dp | inline style `28px` |
| Switch animation | 200ms cubic-bezier(0.2,0,0,1) | `duration-200 ease-[cubic-bezier(0.2,0,0,1)]` |

**Current status:** Switch is well-implemented with correct handle sizes and easing. Checkbox and Radio need verification of visual box size vs touch target separation.

#### 3. Chips

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Height | 32dp | `h-8` |
| Shape | corner-small (8dp) | `rounded-lg` |
| Typography | Label Large 14/20/500/0.1 | `text-[14px] leading-5 font-medium tracking-[0.1px]` |
| Padding (no icons) | 16dp | `px-4` |
| Padding (icon side) | 8dp | `pl-2` or `pr-2` |
| Icon size | 18dp | `size-[18px]` |
| Icon-label gap | 8dp | `gap-2` or `mr-2`/`ml-2` |
| Selected bg | secondary-container | `bg-secondary-container` |
| Selected text | on-secondary-container | `text-secondary-container-foreground` |
| Elevated bg | surface-container-low | `bg-surface-container-low` |
| Elevated shadow | Level 1 | `shadow-[0_1px_3px_1px_hsl(var(--elevation-1)),...]` |
| Disabled | 38% opacity | `opacity-[0.38]` |

**Current status:** Chip is compliant. State layer uses `before:` pseudo correctly.

#### 4. Cards

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Shape | corner-medium (12dp) | `rounded-xl` |
| Elevated bg | surface-container-low | `bg-surface-container-low` |
| Elevated shadow | Level 1 | `shadow-[0_1px_3px_1px_hsl(var(--elevation-1)),...]` |
| Filled bg | surface-container-highest | `bg-surface-container-highest` |
| Outlined bg | surface | `bg-surface` |
| Outlined border | 1dp outline-variant | `border border-outline-variant` |
| Sub-component padding | 16dp horizontal | `px-4` |
| Interactive hover (elevated) | Level 2 | compound variant shadow |

**Current gap:** Filled variant uses `bg-surface-container-high` — M3 spec says `surface-container-highest`. Fix: change to `bg-surface-container-highest`.

#### 5. Select/Dropdown

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Trigger height | 56dp | `h-14` |
| Outlined border | 1dp outline, 4dp radius | `border border-outline rounded-sm` |
| Dropdown bg | surface-container | `bg-surface-container` |
| Dropdown shape | corner-extra-small (4dp) | `rounded-sm` |
| Dropdown elevation | Level 2 | `shadow-[0_3px_6px_var(--elevation-2),...]` |
| Menu item height | 48dp | `h-12` |
| Menu item typography | Body Large 16/24/400/0.5 | `text-[16px] leading-6 tracking-[0.5px]` |
| Min-width | 112dp | `min-w-28` |
| Max-width | 280dp | `max-w-70` |
| Vertical padding | 8dp | `py-2` |

#### 6. Tabs

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Container height (no icons) | 48dp | `h-12` |
| Container height (with icons) | 64dp | `h-16` |
| Primary indicator | 3dp tall, rounded top | inline style + `borderTopLeftRadius` |
| Secondary indicator | 2dp tall, full width | inline style |
| Label typography | Title Small 14/20/500/0.1 | `text-[14px] leading-5 font-medium tracking-[0.1px]` |
| Icon size | 24dp | `size-6` |
| Bottom divider | border-outline-variant | `border-b border-outline-variant` |
| Indicator animation | left+width 200ms | `transition-[left,width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]` |

**Current status:** Tabs implementation matches spec. Indicator uses correct animation timing and primary variant spans label width only.

#### 7. Navigation

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| AppBar height | 64dp | `h-16` |
| AppBar bg (rest) | surface | `bg-surface` |
| AppBar bg (elevated) | surface-container | `bg-surface-container` |
| NavigationRail collapsed width | 80dp | `w-20` |
| NavigationRail bg | surface-container | `bg-surface-container` |
| Active indicator | secondary-container, pill | `bg-secondary-container rounded-full` |
| NavigationBar height | 80dp | `h-20` |
| Icon size | 24dp | `size-6` |
| Label typography | Label Medium 12/16/500/0.5 | `text-[12px] leading-4 font-medium tracking-[0.5px]` |

**Current gap:** NavigationRail collapsed width is `w-24` (96dp) instead of `w-20` (80dp). Fix: change to `w-20`.

#### 8. Menu/Context Menu

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Min-width | 112dp | `min-w-28` |
| Max-width | 280dp | `max-w-70` |
| Shape | corner-extra-small (4dp) | `rounded-sm` |
| Background | surface-container | `bg-surface-container` |
| Elevation | Level 2 | shadow with `--elevation-2` vars |
| Item height | 48dp | `h-12` |
| Item padding | 12dp | `px-3` |
| Item typography | Body Large 16/24/400/0.5 | `text-[16px] leading-6 tracking-[0.5px]` |
| Icon size | 24dp | `size-6` via `<Icon size={24}>` |
| Icon color | on-surface-variant | `text-surface-variant-foreground` |
| Divider | 1dp, outline-variant, 8dp margin | `h-px my-2 bg-outline-variant` |
| Enter animation | fade+scale 150ms ease-out | `m3-animate-menu` class |
| Exit animation | fade 75ms linear | `m3-animate-menu` class |

**Current gap:** Menu uses `--elevation-3` shadow — spec says Level 2. Fix: change shadow to use `--elevation-2`.

#### 9. Snackbar

| Token | M3 Value | Tailwind Class |
|-------|----------|----------------|
| Shape | corner-extra-small (4dp) | `rounded-sm` |
| Background | inverse-surface | `bg-inverse-surface` |
| Text color | inverse-on-surface | `text-inverse-on-surface` |
| Elevation | Level 3 | shadow with `--elevation-3` |
| Supporting text | Body Medium 14/20/400/0.25 | `text-[14px] leading-5 tracking-[0.25px]` |
| Action typography | Label Large 14/20/500/0.1 | `text-[14px] font-medium leading-5 tracking-[0.1px]` |
| Action color | inverse-primary | `text-[hsl(var(--inverse-primary))]` |
| Min height | 48dp | `min-h-12` |
| Left padding | 16dp | `pl-4` |
| Max-width (desktop) | 560dp | `max-w-140` |
| Enter animation | slide from bottom 200ms | motion/react spring |
| Exit animation | fade 150ms | motion/react opacity exit |
| Auto-dismiss (no action) | 6000ms | code logic |
| Persistent (with action) | indefinite | code logic |

**Current status:** Snackbar is largely compliant. Uses motion/react for spring animations.

#### 10. Remaining Components

| Component | Token | M3 Value | Tailwind Class |
|-----------|-------|----------|----------------|
| Slider active track | primary | — | `bg-primary` |
| Slider inactive track | secondary-container | — | `bg-secondary-container` |
| Slider handle | 44dp × 4dp, primary | — | `w-1 h-11 bg-primary` |
| Slider track height | 16dp, 8dp radius | — | `h-4 rounded-lg` |
| Badge dot | 6dp × 6dp, error | — | `size-1.5 bg-error` |
| Badge count | 16dp min, Label Small 11/16/500 | — | `min-w-4 h-4 text-[11px]` |
| Tooltip plain | inverse-surface, 24dp h, 4dp radius | — | `bg-inverse-surface h-6 rounded-sm` |
| Tooltip rich | surface-container, 12dp radius, Level 2 | — | `bg-surface-container rounded-xl` |
| List 1-line | 56dp | — | `h-14` |
| List 2-line | 72dp | — | `h-18` |
| List 3-line | 88dp | — | `h-22` |
| Divider | 1dp, outline-variant | — | `h-px bg-outline-variant` |
| CircularProgress | 48dp default, 4dp stroke, primary | — | `size-12` + SVG stroke-width 4 |
| LinearProgress | 4dp height, primary active, surface-container-highest inactive | — | `h-1 bg-primary` / `bg-surface-container-highest` |
| Search | 56dp, corner-full (28dp), search icon 24dp | — | `h-14 rounded-full` |

---

## Data Models

No data model changes are required. The audit operates exclusively on the presentation layer (CSS classes, tokens, animation parameters). Component props, TypeScript interfaces, and API surfaces remain unchanged.

### Tokens Already Defined in `theme.css`

The following CSS custom properties are already available and should be referenced via Tailwind utilities:

- **Colors:** `--primary`, `--on-primary`, `--secondary-container`, `--on-secondary-container`, `--surface-container-*`, `--outline`, `--outline-variant`, `--inverse-surface`, `--inverse-on-surface`, `--inverse-primary`, `--error`
- **Elevation:** `--elevation-1` through `--elevation-5` (opacity values for box-shadow)
- **Shape:** `--shape-full`, `--shape-xl` (28px), `--shape-lg` (16px), `--shape-md` (12px), `--shape-sm` (8px)
- **State layer:** `--state-hover` (0.08), `--state-focus` (0.10), `--state-press` (0.10)

---

## Animation Strategy (M3 Expressive Spring Motion)

### Shape Morph on Press

M3 Expressive calls for spring physics shape morphs on interactive press. The implementation pattern:

```tsx
// In CVA base classes:
"transition-[border-radius,box-shadow] duration-100 ease-out"

// Resting state (per variant):
"rounded-full"

// Active/pressed state (morph target):
"active:rounded-xl"  // reduces from 9999px → 16px
```

**Parameters:**
- Duration: `100ms` (approximates a critically-damped spring settling time)
- Easing: `ease-out` (or `cubic-bezier(0.2, 0, 0, 1)` for M3 standard)
- Property: `border-radius` (and optionally `box-shadow` for elevation transitions)

### Selection Control Transitions

Switch handle, checkbox check, radio dot all use:

```css
transition-[left,width,height,background-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]
```

### Menu/Dialog Enter/Exit

Already defined in `theme.css` as `@keyframes` with `data-state` driven CSS classes:
- Enter: `m3-zoom-in 150ms ease-out` + directional slide
- Exit: `m3-zoom-out 75ms linear`
- Overlay: spring-approximated fade using `linear()` easing

### Snackbar (motion/react)

Uses JavaScript spring animation via `motion/react`:
- Enter: `{ y: "100%", opacity: 0 }` → `{ y: 0, opacity: 1 }` with 200ms M3 standard easing
- Exit: `{ opacity: 0 }` with 150ms

### Tab Indicator

CSS transition on absolutely-positioned indicator:
```css
transition-[left,width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]
```

---

## State Layer Implementation Pattern

All interactive M3 components implement state feedback via a `::before` pseudo-element overlay:

```tsx
// Base classes added to the interactive element:
"relative overflow-hidden"

// Pseudo-element setup:
"before:absolute before:inset-0 before:rounded-[inherit]"
"before:bg-current before:opacity-0"
"before:transition-opacity before:duration-200 before:pointer-events-none"

// State layer opacities (M3 spec):
"hover:before:opacity-[0.08]"      // 8% hover
"focus-visible:before:opacity-[0.10]"  // 10% focus
"active:before:opacity-[0.10]"     // 10% press
```

**Key design decisions:**
1. `before:bg-current` inherits the element's `color` (which is the on-color for each variant), so the state layer automatically matches the correct tint without per-variant overrides.
2. `before:rounded-[inherit]` ensures the overlay clips to the component's shape.
3. `overflow-hidden` on the parent clips the pseudo to the container bounds.
4. Content that needs to appear above the overlay gets `relative z-10`.

**Exception:** For components where the state layer tint differs from `currentColor` (e.g., Cards use `on-surface` regardless of text color), the pattern uses explicit HSL references:
```tsx
"hover:before:bg-[hsl(var(--on-surface)/0.08)]"
```

---

## Elevation Strategy

### Tonal Elevation (filled/tonal surfaces)

For filled and tonal components, elevation is expressed through **surface color progression** rather than drop shadows:

```
Level 0: surface / surface-container
Level 1: surface-container-low
Level 2: surface-container
Level 3: surface-container-high
Level 4: surface-container-highest
```

This is used for:
- Filled buttons (no shadow at rest)
- Tonal buttons (no shadow at rest)
- FAB "surface" color variant (tonal elevation at rest)
- Card "filled" variant (no shadow)

### Shadow Elevation (elevated surfaces, overlays)

For elevated variants and popup surfaces, elevation uses CSS `box-shadow` with opacity from `--elevation-N` tokens:

| Level | Usage | Shadow Pattern |
|-------|-------|---------------|
| 0 | Filled card, outlined card | No shadow |
| 1 | Elevated card/button rest, filled button hover | `0_1px_3px_var(--elevation-1)` |
| 2 | Menu, dropdown, elevated card hover | `0_3px_6px_var(--elevation-2)` |
| 3 | FAB rest, Snackbar | `0_4px_8px_var(--elevation-3),0_1px_3px_var(--elevation-3)` |
| 4 | FAB hover | `0_6px_12px_var(--elevation-4),0_2px_4px_var(--elevation-4)` |

### When to Use Which

| Scenario | Strategy |
|----------|----------|
| Filled/tonal container at rest | Tonal (bg color change, no shadow) |
| Filled/tonal container on hover | Add Level 1 shadow (subtle lift feedback) |
| Elevated container at rest | Shadow Level 1 |
| Popup/overlay (menu, dropdown, tooltip) | Shadow Level 2–3 |
| FAB at rest | Shadow Level 3 |
| FAB on hover | Shadow Level 4 |

---

## Consumer-Friendly Wrapper Pattern

Every component root element follows the **isolation principle** — no forced layout constraints that break composability:

### Rules

1. **No forced `position: fixed|absolute`** on root — unless an explicit prop opts in (e.g., FAB `fixed` prop, Snackbar container which is always fixed by nature).
2. **No forced `width`** on root — components use `inline-flex` or intrinsic sizing. The consumer controls width via their own container or `className` override.
3. **`isolate` class** on components that use `z-index` internally (e.g., Slider uses `isolate` to scope stacking context).
4. **Root accepts `className` prop** — consumers can always override or extend styling.

### Audit Checklist per Component

```
□ Root has NO position: fixed/absolute (unless opted in by prop)
□ Root has NO explicit width (w-*, max-w-*) that constrains layout
□ Root uses inline-flex or block layout (fits content naturally)
□ Root accepts className for consumer overrides
□ Children that need z-ordering use relative z-10, not absolute z-*
```

### Current Violations to Fix

| Component | Issue | Fix |
|-----------|-------|-----|
| NavigationRail | Has `z-40` on root | Keep (nav chrome legitimately needs stacking) — document as intentional |
| Snackbar container | `fixed` position | Keep (notification layer is always fixed) — not a consumer wrapper |
| FAB with `fixed` prop | `fixed right-4 bottom-4` | ✓ Only when `fixed={true}` — correct |

---

## Error Handling

Error handling is not materially affected by this audit. The changes are purely presentational (CSS classes and animation parameters). Existing component error boundaries, prop validation, and accessibility attributes remain unchanged.

The only error-adjacent concern is **graceful degradation:**

1. **Missing tokens:** If a consumer's app does not import `theme.css`, CSS custom properties resolve to empty strings. Components should still render (just with incorrect colors). This is existing behavior and not a regression.
2. **Reduced motion:** The `@media (prefers-reduced-motion: reduce)` block in `theme.css` already disables all animations. No audit change should break this.
3. **Unknown variants:** CVA's `defaultVariants` ensures a valid output even when no variant prop is passed.

---

## Testing Strategy

### Why Property-Based Testing Does NOT Apply

This feature is a **visual token audit** — it verifies that fixed, deterministic CSS class names are applied to components. There is no meaningful input variation: the M3 token values are constants (40dp height, 8% hover opacity, etc.), and components render deterministically with those classes. The "for all inputs" quantification required by PBT does not apply here.

### Recommended Testing Approach

1. **Snapshot Tests (primary)**
   - Render each component variant with `@testing-library/react`
   - Snapshot the root element's `className` string
   - Detect unintended class regressions during future changes

2. **Example-Based Unit Tests**
   - For each component: render at each variant/size, assert specific Tailwind classes are present
   - Example: `expect(container).toHaveClass('h-10', 'px-6', 'rounded-full')`
   - Verify state layer pseudo-element classes are included
   - Verify no `position: fixed` or explicit `width` on root (unless opted in)

3. **Visual Regression Tests (optional, high value)**
   - Storybook snapshots or Chromatic/Percy for pixel-accurate M3 compliance
   - Compare before/after audit changes

4. **Manual Accessibility Audit**
   - Verify touch targets meet 48dp minimum
   - Verify focus rings are visible and correctly scoped
   - Verify `prefers-reduced-motion` disables animations

### Test Organization

```
tests/
├── buttons/
│   ├── button.test.tsx       # Class assertions per variant/size
│   └── fab.test.tsx
├── selection-controls/
│   ├── checkbox.test.tsx
│   ├── radio.test.tsx
│   └── switch.test.tsx
├── chip.test.tsx
├── card.test.tsx
├── select.test.tsx
├── tabs.test.tsx
├── navigation.test.tsx
├── menu.test.tsx
├── snackbar.test.tsx
└── remaining.test.tsx        # slider, badge, tooltip, list, divider, progress, search
```

Each test file verifies:
- Correct dimensional classes for each size variant
- Correct color classes for each color/style variant
- State layer classes present on interactive elements
- Animation/transition classes present
- No forced position/width on root wrapper (consumer-friendliness)
