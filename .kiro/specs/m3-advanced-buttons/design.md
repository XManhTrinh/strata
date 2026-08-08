# Design Document: M3 Advanced Buttons

## Overview

This design describes three new M3 Expressive components — **Extended FAB**, **FAB Menu**, and **Split Button** — that extend the existing Material Design 3 button system in the Strata web application. These components build directly on the patterns established in the `m3-buttons` spec (CVA-per-component, state layers via `::before` pseudo-element, theming-first via CSS custom properties, Radix Slot for `asChild`).

**Key design decisions:**

- **Extended FAB as a standalone component** — Rather than extending the existing FAB's `extended` size variant (which uses Label Large typography), the new ExtendedFAB component uses Title Medium typography and supports three distinct sizes (56/80/96dp). This warrants a separate component file to avoid overloading the existing FAB with incompatible typography and size logic.
- **FAB Menu uses Framer Motion (`motion`)** — The staggered open/close animation and AnimatePresence for exit animations require the `motion` package already installed in the project. Focus trapping is implemented manually (no additional dependency like `@radix-ui/react-focus-scope` needed given the controlled item list).
- **Split Button uses CSS transitions for inner corner morph** — The inner corner radius animation on hover/focus/press uses CSS `transition` on `border-radius`, consistent with the existing FAB shape morph pattern. The trailing icon rotation uses a CSS transform with transition.
- **No ripple effects** — Consistent with the existing system, all interaction feedback uses flat state layers (8%/10%/10% opacity via `::before` pseudo-element).
- **Dark mode automatic** — All components reference CSS custom properties that already have dark-mode counterparts in `globals.css`. No component code changes needed for dark mode.

**Component file locations:**
- `apps/web/src/components/ui/mui/extended-fab.tsx`
- `apps/web/src/components/ui/mui/fab-menu.tsx`
- `apps/web/src/components/ui/mui/split-button.tsx`

## Architecture

```mermaid
graph TD
    subgraph "Token Layer (globals.css)"
        T[CSS Custom Properties<br/>--primary, --on-primary,<br/>--primary-container, etc.]
        ST[State Tokens<br/>--state-hover: 0.08<br/>--state-focus: 0.10<br/>--state-press: 0.10]
        SH[Shape Tokens<br/>--shape-full, --shape-lg, etc.]
        EL[Elevation Tokens<br/>--elevation-1 through --elevation-5]
    end

    subgraph "Tailwind Theme Bridge (@theme)"
        TW[Tailwind color-* utilities<br/>mapped from CSS vars]
    end

    subgraph "Existing Components"
        FAB[FAB<br/>fab.tsx]
        BTN[Button<br/>button.tsx]
    end

    subgraph "New Components"
        EFAB[ExtendedFAB<br/>extended-fab.tsx]
        FM[FABMenu<br/>fab-menu.tsx]
        SB[SplitButton<br/>split-button.tsx]
    end

    subgraph "Shared Utilities"
        CN[cn() utility]
        CVA[class-variance-authority]
        SLOT[Radix Slot — asChild]
        MOTION[motion — Framer Motion v12]
    end

    T --> TW
    ST --> TW
    SH --> TW
    EL --> TW
    TW --> EFAB
    TW --> FM
    TW --> SB
    CN --> EFAB
    CN --> FM
    CN --> SB
    CVA --> EFAB
    CVA --> SB
    SLOT --> EFAB
    SLOT --> SB
    MOTION --> FM
    MOTION --> SB
    FAB --> FM
    BTN --> SB
```

### Extended FAB Strategy

The ExtendedFAB is a self-contained component with its own CVA definition. It shares the state layer pattern with the existing FAB but differs in:
- Typography: Title Medium (16px/500/24px/0.15px) vs Label Large (14px/500/20px/0.1px)
- Sizes: 56dp/80dp/96dp (all with 16dp corner radius) vs the FAB's fixed sizes
- Colors: 6 options (3 container + 3 fixed) vs FAB's 4

The component uses the same `::before` state layer approach, elevation shadow pattern, and shape morph on press as the existing FAB.

### FAB Menu Strategy

The FABMenu is a compound component with these parts:
- **Trigger**: An existing FAB component passed as a prop (not rendered internally)
- **Close button**: A 56dp circular button replacing the FAB position when open
- **Menu items**: 48dp-height action buttons with icon + label
- **Overlay**: An `AnimatePresence`-wrapped container for enter/exit animations

Animation uses `motion` with `staggerChildren` for the staggered item reveal. Focus trapping is manual: on open, focus moves to close button; arrow keys cycle through items; escape closes and returns focus to trigger.

### Split Button Strategy

The SplitButton is a composite component rendered as a flex container with two segments separated by a 2dp gap. Key architecture:
- **Outer container**: Holds both segments with `gap-[2px]`
- **Leading segment**: Full pill on left corners, inner corner radius on right
- **Trailing segment**: Inner corner radius on left, full pill on right corners
- **Inner corner morph**: CSS transition on `border-radius` triggered by hover/focus/active states
- **Icon rotation**: CSS `transform: rotate()` with 200ms transition
- **Menu integration**: Uses Radix `DropdownMenu` (already installed) for the trailing dropdown

The trailing icon offset when closed is achieved via `translateX()` applied to the icon wrapper.

## Components and Interfaces

### 1. ExtendedFAB Component (`apps/web/src/components/ui/mui/extended-fab.tsx`)

```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const extendedFabVariants = cva(
  [
    // Layout
    "relative inline-flex items-center justify-center",
    // Typography: Title Medium
    "text-[16px] font-medium leading-[24px] tracking-[0.15px]",
    // Cursor & interaction
    "cursor-pointer select-none",
    // Transition for elevation + shape morph
    "transition-[border-radius,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
    // Focus ring
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    // Elevation Level 3 rest, Level 4 hover
    "shadow-[0_4px_8px_var(--elevation-3),0_1px_3px_var(--elevation-3)]",
    "hover:shadow-[0_6px_12px_var(--elevation-4),0_2px_4px_var(--elevation-4)]",
    // State layer
    "overflow-hidden",
    "before:absolute before:inset-0 before:rounded-[inherit]",
    "before:bg-current before:opacity-0",
    "before:transition-opacity before:duration-200 before:pointer-events-none",
    "hover:before:opacity-[0.08]",
    "focus-visible:before:opacity-[0.10]",
    "active:before:opacity-[0.10]",
    // Shape: M3 Large (16dp), morph on press
    "rounded-[16px] active:rounded-[12px]",
    // Min width
    "min-w-[80px]",
    // Icon sizing
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[24px]",
    "[&_.material-symbols-rounded]:pointer-events-none [&_.material-symbols-rounded]:text-[24px]",
  ].join(" "),
  {
    variants: {
      color: {
        primary: "bg-primary-container text-primary-container-foreground",
        secondary: "bg-secondary-container text-secondary-container-foreground",
        tertiary: "bg-tertiary-container text-tertiary-container-foreground",
        "primary-fixed": "bg-primary text-primary-foreground",
        "secondary-fixed": "bg-secondary text-secondary-foreground",
        "tertiary-fixed": "bg-tertiary text-tertiary-foreground",
      },
      size: {
        small: "h-14 px-4 gap-4",   // 56dp
        medium: "h-20 px-4 gap-4",  // 80dp
        large: "h-24 px-4 gap-4",   // 96dp
      },
    },
    defaultVariants: {
      color: "primary",
      size: "medium",
    },
  }
);

export interface ExtendedFABProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof extendedFabVariants> {
  /** Render as child element (Radix Slot pattern) */
  asChild?: boolean;
  /** Leading icon (React node) */
  icon: React.ReactNode;
  /** Label text (required, provides accessible name) */
  label: string;
  /** Color scheme */
  color?: "primary" | "secondary" | "tertiary" | "primary-fixed" | "secondary-fixed" | "tertiary-fixed";
  /** Size */
  size?: "small" | "medium" | "large";
  /** Fixed positioning (bottom-right) */
  fixed?: boolean;
  /** Loading state */
  loading?: boolean;
}

const ExtendedFAB = React.forwardRef<HTMLButtonElement, ExtendedFABProps>(
  ({ className, color, size, asChild, icon, label, fixed, loading, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // ... implementation
  }
);
ExtendedFAB.displayName = "ExtendedFAB";

export { ExtendedFAB, extendedFabVariants };
```

### 2. FABMenu Component (`apps/web/src/components/ui/mui/fab-menu.tsx`)

```typescript
import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface FABMenuItemProps {
  /** Icon (React node) */
  icon: React.ReactNode;
  /** Label text */
  label: string;
  /** Action callback */
  onClick: () => void;
  /** Optional aria-label override */
  "aria-label"?: string;
}

export interface FABMenuProps {
  /** The FAB element that triggers the menu */
  trigger: React.ReactElement;
  /** Menu items (2-6 items) */
  items: FABMenuItemProps[];
  /** Color set for close button vs items */
  colorSet?: "primary" | "secondary" | "tertiary";
  /** Controlled open state */
  open?: boolean;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Close button accessible label */
  closeLabel?: string;
  /** Additional className for the container */
  className?: string;
}

const FABMenu: React.FC<FABMenuProps> = ({
  trigger,
  items,
  colorSet = "primary",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  closeLabel = "Close menu",
  className,
}) => {
  // State management (controlled/uncontrolled)
  // Focus trap logic
  // Keyboard navigation (ArrowUp/Down, Escape)
  // Click-outside dismissal
  // Animation orchestration via motion
};

export { FABMenu };
```

### 3. SplitButton Component (`apps/web/src/components/ui/mui/split-button.tsx`)

```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const splitButtonVariants = cva(
  "relative inline-flex items-center",
  {
    variants: {
      variant: {
        elevated: "shadow-sm hover:shadow-md",
        filled: "",
        tonal: "",
        outlined: "",
      },
      size: {
        xs: "h-8",    // 32dp
        s: "h-10",   // 40dp
        m: "h-12",   // 48dp
        l: "h-14",   // 56dp
        xl: "h-16",  // 64dp
      },
    },
    defaultVariants: {
      variant: "tonal",
      size: "m",
    },
  }
);

// Inner corner radii per size
const innerRadii = { xs: "4px", s: "4px", m: "4px", l: "8px", xl: "12px" } as const;

// Trailing icon offsets per size (when closed)
const iconOffsets = { xs: "-1px", s: "-1px", m: "-2px", l: "-3px", xl: "-6px" } as const;

export interface SplitButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof splitButtonVariants> {
  /** Leading button icon */
  icon?: React.ReactNode;
  /** Leading button label */
  label?: React.ReactNode;
  /** Leading button click handler */
  onLeadingClick?: (e: React.MouseEvent) => void;
  /** Menu content (dropdown items) */
  menuContent: React.ReactNode;
  /** Variant */
  variant?: "elevated" | "filled" | "tonal" | "outlined";
  /** Size */
  size?: "xs" | "s" | "m" | "l" | "xl";
  /** Disabled (both segments) */
  disabled?: boolean;
  /** Disabled (leading only) */
  leadingDisabled?: boolean;
  /** Disabled (trailing only) */
  trailingDisabled?: boolean;
  /** Render leading segment as child (Radix Slot) */
  leadingAsChild?: boolean;
  /** Leading segment children (when leadingAsChild is true) */
  leadingChildren?: React.ReactNode;
  /** Leading segment aria-label */
  "aria-label"?: string;
}

const SplitButton = React.forwardRef<HTMLDivElement, SplitButtonProps>(
  (props, ref) => {
    const [menuOpen, setMenuOpen] = React.useState(false);
    // ... implementation with DropdownMenu from Radix
  }
);
SplitButton.displayName = "SplitButton";

export { SplitButton, splitButtonVariants };
```

## Data Models

### Token → Component Mapping

| Visual Property | CSS Variable | Tailwind Utility | Used By |
|---|---|---|---|
| ExtendedFAB primary bg | `--primary-container` | `bg-primary-container` | ExtendedFAB(primary) |
| ExtendedFAB primary text | `--on-primary-container` | `text-primary-container-foreground` | ExtendedFAB(primary) |
| ExtendedFAB primary-fixed bg | `--primary` | `bg-primary` | ExtendedFAB(primary-fixed) |
| ExtendedFAB primary-fixed text | `--on-primary` | `text-primary-foreground` | ExtendedFAB(primary-fixed) |
| FABMenu close button bg | `--primary-container` | `bg-primary-container` | FABMenu close(primary) |
| FABMenu item surface | `--surface-container-high` | `bg-surface-container-high` | FABMenu items |
| FABMenu item text | `--primary` | `text-primary` | FABMenu items(primary) |
| SplitButton filled bg | `--primary` | `bg-primary` | SplitButton(filled) |
| SplitButton filled text | `--on-primary` | `text-primary-foreground` | SplitButton(filled) |
| SplitButton tonal bg | `--secondary-container` | `bg-secondary-container` | SplitButton(tonal) |
| SplitButton tonal text | `--on-secondary-container` | `text-secondary-container-foreground` | SplitButton(tonal) |
| SplitButton outlined border | `--outline` | `border-outline` | SplitButton(outlined) |
| SplitButton elevated bg | `--surface-container-low` | `bg-surface-container-low` | SplitButton(elevated) |
| Elevation Level 1 | `--elevation-1` | shadow utility | SplitButton(elevated) |
| Elevation Level 3 | `--elevation-3` | shadow utility | ExtendedFAB rest |
| Elevation Level 4 | `--elevation-4` | shadow utility | ExtendedFAB hover |
| State hover (8%) | `--state-hover` | `hover:before:opacity-[0.08]` | All components |
| State focus (10%) | `--state-focus` | `focus-visible:before:opacity-[0.10]` | All components |
| State press (10%) | `--state-press` | `active:before:opacity-[0.10]` | All components |

### ExtendedFAB Size Specifications

| Size | Height | Padding H | Gap (icon→label) | Corner Radius | Icon Size | Typography |
|------|--------|-----------|-------------------|---------------|-----------|------------|
| small | 56dp (h-14) | 16dp (px-4) | 16dp (gap-4) | 16dp | 24×24dp | Title Medium |
| medium | 80dp (h-20) | 16dp (px-4) | 16dp (gap-4) | 16dp | 24×24dp | Title Medium |
| large | 96dp (h-24) | 16dp (px-4) | 16dp (gap-4) | 16dp | 24×24dp | Title Medium |

### SplitButton Inner Corner Specifications

| Size | Height | Outer Radius | Inner Radius (rest) | Inner Radius (hover/focus/press) | Icon Offset (closed) |
|------|--------|--------------|---------------------|----------------------------------|---------------------|
| xs | 32dp | 9999px | 4dp | → full (9999px) | -1dp |
| s | 40dp | 9999px | 4dp | → full (9999px) | -1dp |
| m | 48dp | 9999px | 4dp | → full (9999px) | -2dp |
| l | 56dp | 9999px | 8dp | → full (9999px) | -3dp |
| xl | 64dp | 9999px | 12dp | → full (9999px) | -6dp |

### FABMenu Layout Specifications

| Element | Dimension | Notes |
|---------|-----------|-------|
| Close button | 56dp × 56dp | Circular, replaces FAB position |
| Menu item | 48dp height | Full width of menu |
| Gap (FAB → first item) | 4dp | Between close button and menu |
| Viewport margins | 16dp | All edges |
| Stagger delay | 50ms | Per item on open |
| Max items | 6 | Dev warning if exceeded |
| Min items | 2 | Dev warning if fewer |

### Animation Parameters

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| ExtendedFAB elevation transition | 200ms | cubic-bezier(0.2, 0, 0, 1) | hover |
| ExtendedFAB shape morph | 100ms | cubic-bezier(0.2, 0, 0, 1) | active |
| FABMenu item stagger | 50ms delay/item | ease-out | open |
| FABMenu item entry | 200ms | cubic-bezier(0.2, 0, 0, 1) | open |
| FABMenu item exit | 150ms | cubic-bezier(0.2, 0, 0, 1) | close (reverse) |
| SplitButton inner corner morph | 200ms | cubic-bezier(0.2, 0, 0, 1) | hover/focus/active |
| SplitButton icon rotation | 200ms | cubic-bezier(0.2, 0, 0, 1) | menu open/close |
| SplitButton icon offset | 200ms | cubic-bezier(0.2, 0, 0, 1) | menu open/close |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: ExtendedFAB size prop maps to correct height

*For any* size value in {small, medium, large}, the rendered ExtendedFAB SHALL include the corresponding height class: small → h-14 (56dp), medium → h-20 (80dp), large → h-24 (96dp).

**Validates: Requirements 1.1**

### Property 2: ExtendedFAB base invariants persist across all size and color combinations

*For any* combination of ExtendedFAB size (small, medium, large) and color (primary, secondary, tertiary, primary-fixed, secondary-fixed, tertiary-fixed), the rendered output SHALL always include: Title Medium typography (text-[16px], font-medium, leading-[24px], tracking-[0.15px]), 16dp horizontal padding (px-4), 16dp gap between icon and label (gap-4), 16dp corner radius (rounded-[16px]), minimum width of 80dp (min-w-[80px]), and 24dp icon size constraint ([&_svg]:size-[24px]).

**Validates: Requirements 1.4, 1.5, 1.6, 1.7, 2.1, 2.2**

### Property 3: ExtendedFAB renders both icon and label content

*For any* ExtendedFAB configuration (any size, any color), the rendered output SHALL contain both the icon element and the label text node in the DOM.

**Validates: Requirements 1.3**

### Property 4: ExtendedFAB color variant pairs correct background with foreground

*For any* color value in {primary, secondary, tertiary, primary-fixed, secondary-fixed, tertiary-fixed}, the rendered ExtendedFAB SHALL include both the correct background class AND the matching foreground class (e.g., primary → bg-primary-container + text-primary-container-foreground; primary-fixed → bg-primary + text-primary-foreground).

**Validates: Requirements 3.1, 3.3**

### Property 5: ExtendedFAB state layers and elevation present for all configurations

*For any* ExtendedFAB regardless of size or color, the rendered output SHALL include: Elevation Level 3 shadow at rest, hover elevation Level 4 shadow class, state layer hover at 8% (hover:before:opacity-[0.08]), state layer focus at 10% (focus-visible:before:opacity-[0.10]), state layer press at 10% (active:before:opacity-[0.10]), and 200ms transition duration with cubic-bezier(0.2, 0, 0, 1) timing.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

### Property 6: ExtendedFAB disabled state prevents interaction with correct visual treatment

*For any* ExtendedFAB size and color combination, when the `disabled` attribute is true, the rendered output SHALL include `opacity-[0.38]` and `pointer-events-none`, and the element SHALL have `tabIndex={-1}` to be removed from the tab order.

**Validates: Requirements 5.3**

### Property 7: ExtendedFAB composition patterns (asChild and ref forwarding)

*For any* ExtendedFAB configuration with `asChild=true` and a single child element, the rendered output SHALL NOT contain a `<button>` wrapper (Radix Slot renders onto child). *For any* ExtendedFAB with a ref, `ref.current` SHALL reference the underlying DOM element.

**Validates: Requirements 6.1, 6.3**

### Property 8: FABMenu renders correct number of items when open

*For any* valid item count N (2 ≤ N ≤ 6), when the FABMenu is open, exactly N elements with `role="menuitem"` SHALL be present in the DOM.

**Validates: Requirements 7.1**

### Property 9: FABMenu structural elements have correct dimensions

*For any* FABMenu configuration when open, the close button SHALL be 56dp (h-14 w-14 rounded-full) and each menu item SHALL have 48dp height (h-12).

**Validates: Requirements 7.2, 7.3**

### Property 10: FABMenu colorSet maps to correct close button and item colors

*For any* colorSet value in {primary, secondary, tertiary}, the close button SHALL use the corresponding container background and on-container foreground, and menu items SHALL use surface-container-high background with the matching color text.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 11: FABMenu ARIA semantics are correct

*For any* FABMenu, the trigger element SHALL have `aria-haspopup="menu"`. When open, the trigger SHALL have `aria-expanded="true"`, the menu container SHALL have `role="menu"`, each item SHALL have `role="menuitem"`, and the close button SHALL have an accessible label. When closed, the trigger SHALL have `aria-expanded="false"`.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**

### Property 12: FABMenu focus management when open

*For any* FABMenu with N items (2 ≤ N ≤ 6) when open, focus SHALL be trapped within the menu (close button and N items). ArrowDown SHALL move focus to the next item, ArrowUp to the previous item, cycling at boundaries.

**Validates: Requirements 10.5, 10.6**

### Property 13: FABMenu dismissal returns focus and closes menu

*For any* open FABMenu, pressing Escape SHALL close the menu and return focus to the trigger FAB. Clicking outside the menu SHALL close the menu. Activating the close button SHALL close the menu.

**Validates: Requirements 10.2, 10.3, 10.4**

### Property 14: FABMenu item activation closes menu and fires callback

*For any* FABMenu item, when activated (click, Enter, or Space), the item's onClick callback SHALL be invoked and the menu SHALL transition to the closed state.

**Validates: Requirements 10.7**

### Property 15: FABMenu respects prefers-reduced-motion

*For any* FABMenu configuration, when `prefers-reduced-motion: reduce` is active, menu items SHALL appear/disappear without staggered animation (zero duration, simultaneous).

**Validates: Requirements 9.5, 22.2**

### Property 16: SplitButton structural invariants

*For any* SplitButton variant and size combination, the rendered output SHALL contain exactly two interactive segment elements separated by a 2dp gap (gap-[2px]), and the trailing segment SHALL always contain a menu icon (chevron/arrow_drop_down).

**Validates: Requirements 13.1, 13.2, 13.6**

### Property 17: SplitButton size prop maps to correct height

*For any* size value in {xs, s, m, l, xl}, the rendered SplitButton segments SHALL include the corresponding height class: xs → h-8 (32dp), s → h-10 (40dp), m → h-12 (48dp), l → h-14 (56dp), xl → h-16 (64dp).

**Validates: Requirements 13.3**

### Property 18: SplitButton corner radii correct per size

*For any* SplitButton size, the outer corners (leading left, trailing right) SHALL have border-radius 9999px (full pill), and the inner corners (leading right, trailing left) SHALL have the size-specific radius: xs/s/m → 4dp, l → 8dp, xl → 12dp.

**Validates: Requirements 14.1, 14.2**

### Property 19: SplitButton variant maps to correct color classes

*For any* variant in {elevated, filled, tonal, outlined}, both segments of the SplitButton SHALL include the correct color classes: filled → bg-primary + text-primary-foreground; tonal → bg-secondary-container + text-secondary-container-foreground; outlined → border-outline + text-primary; elevated → bg-surface-container-low + text-primary + shadow.

**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**

### Property 20: SplitButton trailing icon state reflects menu open/closed

*For any* SplitButton size, when the menu is closed the trailing icon SHALL have a translateX offset (per size: xs/s → -1dp, m → -2dp, l → -3dp, xl → -6dp) and rotate(0deg). When the menu is open, the icon SHALL be centered (translateX 0) with rotate(180deg).

**Validates: Requirements 16.1, 16.2, 16.3**

### Property 21: SplitButton state layers are independent per segment

*For any* SplitButton configuration, each segment SHALL have its own state layer (::before pseudo-element) with hover at 8% opacity, focus-visible at 10% opacity, and active at 10% opacity, operating independently (hovering one segment SHALL NOT affect the other).

**Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**

### Property 22: SplitButton menu interaction patterns

*For any* SplitButton, activating the trailing segment (click, Enter, Space) SHALL toggle the dropdown menu. When the menu is open, pressing Escape SHALL close the menu and return focus to the trailing segment. Clicking outside both the menu and the button SHALL close the menu.

**Validates: Requirements 18.1, 18.3, 18.4**

### Property 23: SplitButton ARIA and disabled semantics

*For any* SplitButton, the leading segment SHALL have `role="button"` with an accessible name, and the trailing segment SHALL have `aria-haspopup="menu"` with `aria-expanded` reflecting menu state. When a segment is disabled, it SHALL have `opacity-[0.38]`, `pointer-events-none`, and be excluded from tab order. The `disabled` prop SHALL disable both segments; `leadingDisabled`/`trailingDisabled` SHALL disable independently.

**Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.6, 19.7**

### Property 24: SplitButton composition (ref forwarding and leadingAsChild)

*For any* SplitButton with a ref, `ref.current` SHALL reference the outer container DOM element. When `leadingAsChild=true` with a child element, the leading segment SHALL render via Radix Slot without an extra wrapper button.

**Validates: Requirements 20.1, 20.2**

## Error Handling

### Invalid Prop Combinations

| Scenario | Behavior |
|---|---|
| `ExtendedFAB` without `label` prop | TypeScript compilation error — `label` is required in the interface. |
| `ExtendedFAB` without `icon` prop | TypeScript compilation error — `icon` is required in the interface. |
| `ExtendedFAB` with `asChild=true` and multiple children | Radix Slot throws a console error in development. Only first child used. |
| `FABMenu` with fewer than 2 items | Dev-mode `console.warn` logged. Menu renders nothing (empty state). |
| `FABMenu` with more than 6 items | Dev-mode `console.warn` logged. Only first 6 items rendered. |
| `FABMenu` with Extended FAB as trigger | Dev-mode `console.warn` logged: "FABMenu trigger should be a standard FAB, not an Extended FAB." Menu still functions. |
| `FABMenu` `open` prop without `onOpenChange` | Controlled mode — menu state doesn't change on user interaction (standard React controlled pattern). |
| `SplitButton` without `menuContent` | TypeScript compilation error — `menuContent` is required. |
| `SplitButton` with both `disabled` and `leadingDisabled`/`trailingDisabled` | `disabled` takes precedence — both segments are disabled regardless of individual props. |
| `SplitButton` with `leadingAsChild=true` and no children | Radix Slot renders nothing. |
| `SplitButton` with `leadingAsChild=true` and multiple children | Radix Slot uses first child; dev console error. |

### Graceful Degradation

- If CSS custom properties are missing (theme not loaded), components render with transparent backgrounds via `hsl()` fallback. No crash.
- If `motion` package fails to load, FABMenu items appear without animation (static rendering). The component is wrapped in a try-catch boundary for the motion import.
- ExtendedFAB fixed positioning works without JS — it's pure CSS. If viewport detection fails, the component uses the default bottom-4 position.
- SplitButton dropdown relies on Radix DropdownMenu which is already a project dependency. If Radix fails, the trailing segment click handler still fires `onOpenChange`.
- All animation transitions respect the global `prefers-reduced-motion: reduce` CSS rule in `globals.css` which forces `transition-duration: 0.01ms`.

## Testing Strategy

### Property-Based Testing

This feature is suitable for property-based testing because:
- Components have clearly defined input domains (size × color × variant × state combinations)
- Universal invariants should hold across ALL combinations (state layers, typography, ARIA attributes, dimensions)
- The input space is large: ExtendedFAB has 3 sizes × 6 colors × 2 disabled states = 36 combos; SplitButton has 5 sizes × 4 variants × 2³ disabled states = 160+ combos
- Pure rendering functions with predictable output based on props

**Library:** [fast-check](https://github.com/dubzzz/fast-check) with React Testing Library

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: m3-advanced-buttons, Property {N}: {property_text}`

**Properties to implement (24 total):**
All 24 correctness properties defined above will be implemented as property-based tests using `fast-check` arbitraries to generate random combinations of variant, size, color, disabled, and menu state props.

### Unit Tests (Example-Based)

Unit tests cover specific examples, edge cases, and behaviors not suited to property generation:

**ExtendedFAB:**
- Default props (size=medium, color=primary)
- `fixed` prop positioning classes
- `asChild` with a Next.js `<Link>` child
- Loading state spinner rendering
- Shape morph on `:active` (rounded-[16px] → rounded-[12px])

**FABMenu:**
- Default colorSet (primary)
- Open/close lifecycle with controlled and uncontrolled modes
- Item count validation (0, 1, 7 items → warning)
- Extended FAB trigger warning
- Stagger animation config values (50ms delay)
- 4dp gap between close button and first item
- Reverse-order exit animation

**SplitButton:**
- Default props (variant=tonal, size=m)
- Leading segment content variations (icon only, label only, both)
- Trailing segment selected state (state layer without color change)
- Inner corner morph transition class presence
- Icon offset values per size
- `leadingAsChild` with router link

### Integration Tests

- Dark mode rendering with `.dark` class (Requirements 21.1–21.3)
- WCAG contrast validation via axe-core for all color variants in light/dark
- `prefers-reduced-motion` behavior for FABMenu stagger and SplitButton icon rotation
- Full page render with all three components to verify no CSS conflicts
- FABMenu focus trap with Tab cycling (end-to-end keyboard flow)
- SplitButton + Radix DropdownMenu integration (open, select item, close)

### Test File Structure

```
apps/web/src/components/ui/mui/__tests__/
├── extended-fab.test.tsx         # Unit + property tests for ExtendedFAB
├── fab-menu.test.tsx             # Unit + property tests for FABMenu
├── split-button.test.tsx         # Unit + property tests for SplitButton
└── advanced-buttons-integration.test.tsx  # Dark mode, a11y, reduced motion
```

