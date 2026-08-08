# Design Document: M3 Buttons

## Overview

This design describes the complete Material Design 3 button system for the Strata web application, replacing the existing single `Button` component with four distinct components: `Button`, `IconButton`, `FAB`, and `SegmentedButtonGroup`. Each component is built on the existing stack (React 19, Tailwind CSS v4, CVA, Radix Slot) and uses the M3 token system already established in `globals.css`.

**Key design decisions:**
- **CVA-per-component** — Each component gets its own `cva()` definition, consistent with the existing `Chip` pattern.
- **State layers via Tailwind pseudo-class utilities** — hover/focus/active states use `bg-{on-color}/{opacity}` overlays through a `::before` pseudo-element, avoiding extra DOM nodes.
- **Theming first** — All visual properties reference CSS custom properties. Swapping the theme means changing token values only; zero component code changes required.
- **Token gap resolution** — The existing theme is missing `surface-container-low` and `surface-container-high` tokens needed for elevated buttons and FABs. These are added to the theme system.
- **Shape morph via CSS scale on border-radius** — The M3 Expressive press shape morph is implemented with CSS `transition` on `border-radius` triggered by `:active`, respecting `prefers-reduced-motion`.

**Out of scope (deferred to future):**
- FAB menu (speed dial)
- Extended FABs beyond the basic `extended` size prop
- Split Button
- Ripple animation (state layers are used per M3 Expressive spec)

## Architecture

```mermaid
graph TD
    subgraph "Token Layer (globals.css)"
        T[CSS Custom Properties<br/>--primary, --on-primary, etc.]
        ST[State Tokens<br/>--state-hover, --state-focus, --state-press]
        SH[Shape Tokens<br/>--shape-full, --shape-xl, etc.]
        EL[Elevation Tokens<br/>--elevation-1 through --elevation-5]
    end

    subgraph "Tailwind Theme Bridge (@theme)"
        TW[Tailwind color-* utilities<br/>mapped from CSS vars]
    end

    subgraph "Component Layer"
        B[Button<br/>button.tsx]
        IB[IconButton<br/>icon-button.tsx]
        F[FAB<br/>fab.tsx]
        SBG[SegmentedButtonGroup<br/>segmented-button-group.tsx]
    end

    subgraph "Shared Utilities"
        CN[cn() utility]
        CVA[class-variance-authority]
        SLOT[Radix Slot — asChild]
        IC[Icon component]
    end

    T --> TW
    ST --> TW
    SH --> TW
    EL --> TW
    TW --> B
    TW --> IB
    TW --> F
    TW --> SBG
    CN --> B
    CN --> IB
    CN --> F
    CN --> SBG
    CVA --> B
    CVA --> IB
    CVA --> F
    CVA --> SBG
    SLOT --> B
    SLOT --> IB
    SLOT --> F
    IC --> B
    IC --> IB
    IC --> F
    IC --> SBG
```

### State Layer Strategy

Rather than adding DOM nodes for state layers, each button component uses a CSS `::before` pseudo-element positioned absolutely over the button surface. The pseudo-element's background color is set to the component's "on-color" (e.g., `on-primary` for filled buttons) and its opacity transitions through hover/focus/active states:

```css
/* Conceptual — applied via Tailwind arbitrary classes */
.button-state-layer::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor; /* inherits the on-color */
  opacity: 0;
  transition: opacity 200ms cubic-bezier(0.2, 0, 0, 1);
  pointer-events: none;
}
.button-state-layer:hover::before { opacity: 0.08; }
.button-state-layer:focus-visible::before { opacity: 0.12; }
.button-state-layer:active::before { opacity: 0.12; }
```

In practice, this is encoded via a shared base class string in each CVA definition plus Tailwind's `before:` variant.

### Shape Morph Strategy

For IconButton and FAB, the M3 Expressive press state reduces border-radius by ~30%. This is achieved via CSS transitions on `border-radius` triggered by `:active`:

```css
/* Example for medium icon button (round shape) */
border-radius: 9999px; /* resting */
border-radius: 14px;   /* active — reduced from round */
transition: border-radius 100ms cubic-bezier(0.2, 0, 0, 1);
```

The `prefers-reduced-motion: reduce` media query (already globally applied) will collapse this transition to instant.

## Components and Interfaces

### 1. Button Component (`apps/web/src/components/ui/button.tsx`)

```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child element (Radix Slot pattern) */
  asChild?: boolean;
  /** Leading icon (React node, typically <Icon />) */
  icon?: React.ReactNode;
  /** Trailing icon (React node) */
  trailingIcon?: React.ReactNode;
  /** Loading state — shows spinner, disables interaction */
  loading?: boolean;
}
```

**Variants:** `filled` (default) | `outlined` | `text` | `elevated` | `tonal`
**Sizes:** `small` (h-[34px]) | `medium` (h-10, default) | `large` (h-12) | `extra-large` (h-14)

### 2. IconButton Component (`apps/web/src/components/ui/icon-button.tsx`)

```typescript
export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Render as child element */
  asChild?: boolean;
  /** Shape: round (circle) or square (rounded square) */
  shape?: "round" | "square";
  /** Enable toggle behavior */
  toggle?: boolean;
  /** Controlled pressed state (used with toggle) */
  pressed?: boolean;
  /** Default pressed state (uncontrolled) */
  defaultPressed?: boolean;
  /** Callback when toggle state changes */
  onPressedChange?: (pressed: boolean) => void;
  /** Remove touch-target padding for dense layouts */
  compact?: boolean;
  /** Required accessible label */
  "aria-label": string;
}
```

**Variants:** `standard` (default) | `filled` | `filled-tonal` | `outlined`
**Sizes:** `small` (34px) | `medium` (40px, default) | `large` (48px) | `extra-large` (56px)
**Shapes:** `round` (default, 9999px) | `square` (size-scaled radius)

### 3. FAB Component (`apps/web/src/components/ui/fab.tsx`)

```typescript
export interface FABProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof fabVariants> {
  /** Render as child element */
  asChild?: boolean;
  /** Icon to display (React node) */
  icon: React.ReactNode;
  /** Label text (required for extended, provides accessible name) */
  label?: string;
  /** Color scheme */
  color?: "primary" | "secondary" | "tertiary" | "surface";
  /** Shape variant */
  shape?: "rounded" | "round";
  /** Fixed positioning (bottom-right) */
  fixed?: boolean;
  /** Loading state */
  loading?: boolean;
}
```

**Sizes:** `small` (40px) | `medium` (56px, default) | `large` (96px) | `extended` (56px height, auto width)
**Colors:** `primary` (default) | `secondary` | `tertiary` | `surface`
**Shapes:** `rounded` (default, size-specific radius) | `round` (9999px)

### 4. SegmentedButtonGroup (`apps/web/src/components/ui/segmented-button-group.tsx`)

```typescript
export interface SegmentedButtonGroupProps {
  /** Selection mode */
  selectionMode?: "single" | "multiple";
  /** Controlled value(s) */
  value?: string | string[];
  /** Uncontrolled default value(s) */
  defaultValue?: string | string[];
  /** Callback on selection change */
  onValueChange?: (value: string | string[]) => void;
  /** Size */
  size?: "small" | "medium";
  /** Equal-width segments */
  equalWidth?: boolean;
  /** Children (SegmentedButton items) */
  children: React.ReactNode;
  /** Additional classes */
  className?: string;
}

export interface SegmentedButtonProps {
  /** Unique value identifier */
  value: string;
  /** Icon name (Material Symbols) */
  icon?: string;
  /** Text label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional classes */
  className?: string;
}
```

## Data Models

### Token → Tailwind Utility Mapping

The following table documents how M3 design tokens map to Tailwind utilities for each button property:

| Visual Property | CSS Variable | Tailwind Utility | Used By |
|---|---|---|---|
| Filled background | `--primary` | `bg-primary` | Button(filled), IconButton(filled) |
| Filled text | `--on-primary` | `text-primary-foreground` | Button(filled), IconButton(filled) |
| Tonal background | `--secondary-container` | `bg-secondary-container` | Button(tonal), IconButton(filled-tonal), Segmented(selected) |
| Tonal text | `--on-secondary-container` | `text-secondary-container-foreground` | Button(tonal), IconButton(filled-tonal), Segmented(selected) |
| Outlined border | `--outline` | `border-outline` | Button(outlined), IconButton(outlined), Segmented |
| Text/icon color (standard) | `--on-surface-variant` | `text-surface-variant-foreground` | IconButton(standard), Segmented(unselected) |
| Elevated bg | `--surface-container-low` | `bg-surface-container-low` | Button(elevated) |
| FAB primary bg | `--primary-container` | `bg-primary-container` | FAB(primary) |
| FAB primary text/icon | `--on-primary-container` | `text-primary-container-foreground` | FAB(primary) |
| FAB surface bg | `--surface-container-high` | `bg-surface-container-high` | FAB(surface) |
| Elevation Level 1 | `--elevation-1` | `shadow-[0_1px_2px_hsl(var(--elevation-1))]` | Button(elevated rest), Button(filled hover) |
| Elevation Level 3 | `--elevation-3` | `shadow-[0_4px_8px_hsl(var(--elevation-3))]` | FAB rest |
| State hover | `--state-hover` (0.08) | `hover:before:opacity-[0.08]` | All |
| State focus | `--state-focus` (0.12) | `focus-visible:before:opacity-[0.12]` | All |
| State press | `--state-press` (0.12) | `active:before:opacity-[0.12]` | All |

### New Tokens Required in `globals.css`

The following M3 tokens are missing and must be added:

```css
:root {
  /* Surface containers (M3 tonal surface elevation) */
  --surface-container-low: 210 20% 97%;
  --surface-container-high: 210 16% 92%;

  /* Shape scale */
  --shape-full: 9999px;
  --shape-xl: 28px;
  --shape-lg: 16px;
  --shape-md: 12px;
  --shape-sm: 8px;
}

.dark {
  --surface-container-low: 214 12% 14%;
  --surface-container-high: 214 10% 22%;
}
```

And the corresponding `@theme` mappings:
```css
@theme {
  --color-surface-container-low: hsl(var(--surface-container-low));
  --color-surface-container-high: hsl(var(--surface-container-high));
}
```

### CVA Variant Structure

Each component uses CVA with a consistent pattern:

```typescript
const buttonVariants = cva(
  /* base: shared styles (typography, state layer setup, transition, cursor) */
  "...",
  {
    variants: {
      variant: { /* visual treatment per variant */ },
      size: { /* dimensions per size */ },
    },
    defaultVariants: {
      variant: "filled",
      size: "medium",
    },
  }
);
```

### State Layer Implementation Pattern

The state layer is implemented as a `before:` pseudo-element in the CVA base string:

```
"relative overflow-hidden before:absolute before:inset-0 before:rounded-[inherit]
 before:bg-current before:opacity-0 before:transition-opacity before:duration-200
 before:pointer-events-none
 hover:before:opacity-[var(--state-hover)]
 focus-visible:before:opacity-[var(--state-focus)]
 active:before:opacity-[var(--state-press)]"
```

The `before:bg-current` ensures the overlay color matches `currentColor`, which is set to the on-color for each variant via the text color. For variants where the state layer color differs from the text color (e.g., filled buttons where text is `on-primary` and that IS the state layer color), we override `before:bg-*` in the variant string.

### Spinner Component (Internal)

A small internal spinner used for the loading state:

```typescript
function ButtonSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
```

For `prefers-reduced-motion: reduce`, the global CSS already disables `animation-duration`, so the spinner will appear static (satisfying Requirement 14.2).


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Button base invariants persist across all variant/size combinations

*For any* combination of Button variant (filled, outlined, text, elevated, tonal) and size (small, medium, large, extra-large), the rendered output SHALL always include M3 Label Large typography classes (text-[14px], leading-[20px], font-medium, tracking-[0.1px]), the full pill shape class (rounded-full), and a 200ms transition duration.

**Validates: Requirements 1.8, 1.10, 2.5**

### Property 2: State layer classes are present for all button-family components and variants

*For any* button-family component (Button with any variant, IconButton with any variant, FAB with any color, SegmentedButton segment), the rendered output SHALL include hover state layer at 8% opacity, focus-visible state layer at 12% opacity, and active state layer at 12% opacity via the `before:` pseudo-element classes.

**Validates: Requirements 2.1, 2.2, 2.3, 4.14, 6.8, 12.11**

### Property 3: Disabled Button prevents interaction with correct visual treatment

*For any* Button variant and size combination, when the `disabled` attribute is true, the rendered output SHALL include `opacity-[0.38]` (or equivalent) and `pointer-events-none`, ensuring the button is visually dimmed and non-interactive.

**Validates: Requirements 2.4, 10.1**

### Property 4: IconButton with default shape is always circular

*For any* IconButton variant and size combination where shape is not explicitly set (defaults to `round`), the rendered element SHALL have `border-radius: 9999px` (via `rounded-full` class).

**Validates: Requirements 4.7**

### Property 5: Toggle state alternates correctly on interaction

*For any* IconButton with `toggle=true` in uncontrolled mode, starting from any initial pressed state, each click/activation SHALL flip the pressed state to its logical complement (true→false, false→true).

**Validates: Requirements 4.11**

### Property 6: aria-pressed reflects actual toggle state

*For any* IconButton with `toggle=true`, the `aria-pressed` attribute on the rendered DOM element SHALL equal the current boolean pressed state (true when pressed, false when unpressed) at all times.

**Validates: Requirements 5.2**

### Property 7: Disabled IconButton is removed from tab order with correct ARIA

*For any* IconButton that is disabled (regardless of variant, size, or shape), the rendered element SHALL have `aria-disabled="true"` and `tabIndex={-1}`, preventing keyboard focus.

**Validates: Requirements 5.3**

### Property 8: FAB color variants always pair container background with matching on-container foreground

*For any* FAB color variant (primary, secondary, tertiary, surface), the rendered output SHALL include both the correct container background class AND the matching on-container foreground class (e.g., `bg-primary-container` paired with `text-primary-container-foreground`).

**Validates: Requirements 6.6**

### Property 9: FAB elevation is present for all configurations

*For any* FAB regardless of size, color, or shape, the rendered output SHALL include the Level 3 elevation shadow class at rest.

**Validates: Requirements 6.7**

### Property 10: Non-extended FAB always has aria-label

*For any* FAB with size other than `extended`, the component SHALL render with an `aria-label` attribute present on the DOM element (providing an accessible name for the icon-only FAB).

**Validates: Requirements 7.1**

### Property 11: asChild renders without wrapper and merges all props onto child

*For any* button-family component (Button, IconButton, FAB) with `asChild=true` and a single child element, the rendered output SHALL NOT contain the default element (no `<button>` wrapper), and the child element SHALL receive all merged className strings, event handlers, and ARIA attributes from the parent component's props.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 12: Button touch target minimum of 48px

*For any* Button with `size=small` (34px visual height), the component SHALL include additional transparent padding or margin such that the effective touch/click target area is at least 48px in both dimensions.

**Validates: Requirements 9.1**

### Property 13: IconButton touch target minimum of 48px for small and medium sizes

*For any* IconButton at `small` (34px) or `medium` (40px) size without the `compact` prop, the component SHALL include additional transparent padding such that the effective touch target area is at least 48px × 48px.

**Validates: Requirements 9.2**

### Property 14: Loading state blocks interaction while maintaining full visibility

*For any* Button variant with `loading=true`, the rendered output SHALL include `pointer-events-none` (blocking interaction) but SHALL NOT include opacity reduction (maintaining full visibility for the loading indicator).

**Validates: Requirements 11.3**

### Property 15: Loading state sets aria-busy

*For any* Button or FAB with `loading=true`, the rendered DOM element SHALL have `aria-busy="true"` attribute present.

**Validates: Requirements 11.4**

### Property 16: Segmented group border-radius merging

*For any* SegmentedButtonGroup containing N segments (N ≥ 2), the first segment SHALL have left-rounded corners (M3 Full shape on left end), the last segment SHALL have right-rounded corners (M3 Full shape on right end), and all middle segments SHALL have 0px border-radius on all corners.

**Validates: Requirements 12.3**

### Property 17: Selection state correctness

*For any* SegmentedButtonGroup in `single` mode and any sequence of segment selections, exactly one segment SHALL be selected after each selection action. *For any* SegmentedButtonGroup in `multiple` mode and any sequence of segment toggles, the final selection set SHALL equal the symmetric difference of all toggle actions applied to the initial state.

**Validates: Requirements 12.12**

### Property 18: Keyboard navigation skips disabled segments

*For any* SegmentedButtonGroup with a mix of enabled and disabled segments, pressing Arrow Right/Left from any focused segment SHALL move focus to the next/previous enabled segment, skipping any disabled segments in between.

**Validates: Requirements 12.14**

### Property 19: ARIA roles match selection mode

*For any* SegmentedButtonGroup with `selectionMode=single`, the container SHALL have `role="group"` and each segment SHALL have `role="radio"` with `aria-checked` reflecting selection state. *For any* SegmentedButtonGroup with `selectionMode=multiple`, each segment SHALL have `role="checkbox"` with `aria-checked` reflecting selection state.

**Validates: Requirements 12.15**

### Property 20: IconButton aria-label is always rendered

*For any* IconButton with an `aria-label` prop provided, the rendered DOM element SHALL have the `aria-label` attribute with the exact provided string value.

**Validates: Requirements 5.1**

## Error Handling

### Invalid Prop Combinations

| Scenario | Behavior |
|---|---|
| `FAB` with size ≠ `extended` and no `aria-label` | TypeScript compilation error (prop is required via type). Dev console warning as fallback for JavaScript consumers. |
| `IconButton` without `aria-label` | TypeScript compilation error. The prop is typed as required. |
| `SegmentedButtonGroup` with 0 children | Renders empty container. No crash. |
| `SegmentedButtonGroup` with all segments disabled | Group is non-interactive. Focus cannot enter the group via keyboard. |
| `Button` with both `loading` and `disabled` | `loading` takes precedence — shows spinner at full opacity. The button remains non-interactive. |
| `IconButton` with `toggle` but no `onPressedChange` (controlled mode missing handler) | Works in uncontrolled mode via internal state. If `pressed` prop is provided without `onPressedChange`, component is controlled and pressing has no visual effect (standard React controlled pattern). |
| `asChild=true` with multiple children | Radix Slot throws a console error in development. Only first child is used. |
| `asChild=true` with no children | Renders nothing (Slot behavior). |
| `compact=true` on IconButton | Removes touch-target padding. Logs `console.warn` in development: "IconButton compact mode: touch target is below 48px minimum. Ensure adequate spacing between adjacent targets." |

### Graceful Degradation

- If a CSS custom property (token) is missing (e.g., theme not loaded), components fall back to browser defaults via `hsl()` returning transparent. No crash.
- If `motion` (Framer Motion) is not imported, components still function — shape morph relies on CSS transitions, not Framer Motion.
- Spinner uses SVG with `currentColor` — always matches the button's text color regardless of theme.

## Testing Strategy

### Property-Based Testing

This feature is suitable for property-based testing because:
- Components have clearly defined input domains (variant × size × state combinations)
- Universal invariants should hold across ALL combinations (state layers, typography, ARIA attributes)
- The input space is large enough (5 variants × 4 sizes × 3 states × 2 disabled/loading = 120+ combinations for Button alone)
- Pure rendering functions with predictable output based on props

**Library:** [fast-check](https://github.com/dubzzz/fast-check) with React Testing Library

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: m3-buttons, Property {N}: {property_text}`

**Properties to implement (20 total):**
All 20 correctness properties defined above will be implemented as property-based tests using `fast-check` arbitraries to generate random combinations of variant, size, shape, color, disabled, loading, and toggle state props.

### Unit Tests (Example-Based)

Unit tests cover specific examples, edge cases, and variant-specific visual treatments:

- Each variant's specific color/elevation/border configuration (Requirements 1.2–1.6, 4.2–4.5, 6.2–6.5)
- Default prop values (Requirements 1.7, 1.11, 4.15, 6.11)
- Icon positioning and sizing (Requirements 3.1–3.5, 4.9)
- Shape morph on press (Requirements 4.10, 6.10)
- Toggle visual treatments (Requirements 4.12, 4.13)
- Loading spinner rendering (Requirements 11.1, 11.2)
- Disabled variant-specific overrides (Requirements 10.2–10.6)
- Segmented button content configurations (Requirement 12.2)
- Segmented button selection visuals (Requirements 12.6–12.8)
- Keyboard activation (Requirements 5.4, 7.3)
- Fixed positioning and responsive behavior (Requirements 7.4, 7.5)
- Ref forwarding (Requirements 8.5–8.7)

### Integration Tests

- Dark mode rendering with `.dark` class applied (Requirement 13.1–13.2)
- WCAG contrast validation via axe-core (Requirement 13.3)
- `prefers-reduced-motion` global behavior (Requirement 14.1–14.3)
- Full page render with all button types to verify no CSS conflicts

### Test File Structure

```
apps/web/src/components/ui/__tests__/
├── button.test.tsx          # Unit + property tests for Button
├── icon-button.test.tsx     # Unit + property tests for IconButton
├── fab.test.tsx             # Unit + property tests for FAB
├── segmented-button-group.test.tsx  # Unit + property tests for SegmentedButtonGroup
└── button-integration.test.tsx      # Dark mode, a11y, reduced motion
```
