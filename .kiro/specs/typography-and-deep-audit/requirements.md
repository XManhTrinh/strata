# Requirements Document

## Introduction

This feature covers two major efforts for the `@strata/mui` M3 Expressive component library:

1. **Typography Component** — A new `Typography` (or `Text`) component implementing the official Material Design 3 type scale with all 15 roles (display, headline, title, body, label × large/medium/small).
2. **Deep Audit of All Components** — A comprehensive review and correction of every existing component to ensure full compliance with official M3 Expressive specifications across dimensions: spacing (margin, padding, gap), sizing, font/type scale, shadows/elevation, border-radius (shape), colors, background colors, animation timing/easing, interaction states (hover, focus, active, pressed, disabled), z-index layering, cursor behavior, and Tailwind CSS v4 canonical class usage.
3. **Collapsible Sidebar Animation Fix** — The docs site sidebar collapsible sections snap open but close smoothly; both transitions must be equally smooth per M3 motion specs.

## Glossary

- **Typography_Component**: A React component that renders text styled according to one of the 15 M3 type scale roles.
- **Type_Scale**: The M3 type system defining 15 roles across 5 categories (display, headline, title, body, label) × 3 sizes (large, medium, small), each with defined font-family, font-weight, font-size, line-height, and letter-spacing.
- **State_Layer**: A semi-transparent overlay on interactive elements per M3 — 8% opacity on hover, 10% on focus, 10% on press.
- **Shape_Scale**: M3 corner radius tokens — full (9999px), xl (28px), lg (16px), md (12px), sm (8px).
- **Elevation_Level**: M3 shadow depth from level 0 (none) to level 5.
- **M3_Motion**: The M3 Expressive motion system specifying duration and easing curves for transitions and animations.
- **Component_Library**: The `@strata/mui` package located in the `mui/` folder containing all M3 Expressive components.
- **Docs_Site**: The Next.js documentation site at `mui/docs/` showcasing all components.
- **Tailwind_v4**: Tailwind CSS version 4+ using `@theme` directive and canonical utility classes.
- **CSS_Custom_Property**: CSS variables (e.g., `--primary`) used to define M3 color tokens consumed by components via `hsl(var(--token))`.
- **Cursor_State**: The CSS `cursor` property value appropriate for an element's interaction affordance (pointer, not-allowed, grab, default, etc.).

## Requirements

### Requirement 1: Typography Component — Type Scale Roles

**User Story:** As a developer, I want a Typography component that renders text in any of the 15 M3 type scale roles, so that I can apply consistent, spec-compliant typography throughout the application.

#### Acceptance Criteria

1. THE Typography_Component SHALL support a `variant` prop with exactly 15 values: `display-large`, `display-medium`, `display-small`, `headline-large`, `headline-medium`, `headline-small`, `title-large`, `title-medium`, `title-small`, `body-large`, `body-medium`, `body-small`, `label-large`, `label-medium`, `label-small`.
2. WHEN a `variant` is specified, THE Typography_Component SHALL apply the font-size, line-height, font-weight, and letter-spacing defined by the official M3 type scale for that role.
3. THE Typography_Component SHALL default the `variant` to `body-medium` when no variant is provided.
4. THE Typography_Component SHALL render the semantically appropriate HTML element for each variant category (e.g., `<h1>`–`<h6>` for display/headline/title, `<p>` for body, `<span>` for label) unless overridden by an `as` prop.
5. THE Typography_Component SHALL accept an `as` prop to override the rendered HTML element while preserving the type scale styling.
6. THE Typography_Component SHALL apply text color from the theme via `text-surface-foreground` by default, and accept a `color` prop for override using M3 color tokens.
7. THE Typography_Component SHALL forward all standard HTML attributes and React `ref` to the rendered element.

### Requirement 2: Typography Component — Theme Integration

**User Story:** As a developer, I want the Typography component to integrate with the M3 theme system, so that text styles update automatically when the theme changes (e.g., light/dark mode).

#### Acceptance Criteria

1. THE Typography_Component SHALL derive all color values from CSS_Custom_Property tokens defined in `theme.css`.
2. WHEN the theme switches between light and dark mode, THE Typography_Component SHALL reflect the updated color tokens without requiring prop changes.
3. THE Typography_Component SHALL support a `className` prop for additional Tailwind_v4 utility class overrides that merge correctly with base styles.

### Requirement 3: Deep Audit — Spacing and Sizing Compliance

**User Story:** As a developer, I want all components to have correct padding, margin, gap, and sizing per official M3 specs, so that the UI matches the design system precisely.

#### Acceptance Criteria

1. THE Component_Library SHALL use padding values that match official M3 Expressive specifications for each component (e.g., Button: 24px horizontal / 10px vertical for medium, Chip: 8px/16px, Card: 16px internal).
2. THE Component_Library SHALL use gap values between internal elements that match official M3 Expressive specifications (e.g., Button icon-to-label gap: 8px).
3. THE Component_Library SHALL use minimum height/width values that match official M3 Expressive specifications (e.g., Button medium: 40px height, Icon Button: 48px touch target with 40px visible).
4. IF a component uses spacing values that deviate from official M3 specs, THEN THE Component_Library SHALL be corrected to use the official values.

### Requirement 4: Deep Audit — Shape (Border Radius) Compliance

**User Story:** As a developer, I want all components to have the correct border-radius per M3 shape scale, so that corners match the design system specification.

#### Acceptance Criteria

1. THE Component_Library SHALL apply border-radius values from the M3 Shape_Scale for each component (e.g., Button: full/9999px, Card: 12px, Chip: 8px, Dialog: 28px, FAB: 16px).
2. IF a component uses a border-radius that does not match the official M3 shape token for that component, THEN THE Component_Library SHALL be corrected to use the correct shape token.

### Requirement 5: Deep Audit — Color and Background Compliance

**User Story:** As a developer, I want all components to use the correct M3 color roles for foreground and background, so that the color scheme is spec-compliant and theme-driven.

#### Acceptance Criteria

1. THE Component_Library SHALL use M3 color roles specified per component (e.g., filled Button: `primary` background with `on-primary` text, outlined Button: `outline` border with `primary` text).
2. THE Component_Library SHALL reference colors exclusively through CSS_Custom_Property tokens, consuming them via `hsl(var(--token))` or Tailwind_v4 semantic classes.
3. IF a component uses a color role that does not match the official M3 specification for that component variant, THEN THE Component_Library SHALL be corrected.

### Requirement 6: Deep Audit — Elevation and Shadow Compliance

**User Story:** As a developer, I want all components to have the correct elevation/shadow levels per M3 specs, so that depth layering is visually accurate.

#### Acceptance Criteria

1. THE Component_Library SHALL apply elevation levels matching official M3 specifications for each component and state (e.g., Card elevated: level 1, FAB: level 3 default / level 4 on hover, Dialog: level 3).
2. THE Component_Library SHALL implement elevation changes on hover/press per M3 interaction patterns (e.g., elevated Card hover: level 2).
3. IF a component uses an elevation level that does not match the official M3 spec, THEN THE Component_Library SHALL be corrected.

### Requirement 7: Deep Audit — State Layer and Interaction States

**User Story:** As a developer, I want all interactive components to display the correct state layers for hover, focus, and press states per M3, so that interaction feedback is spec-compliant.

#### Acceptance Criteria

1. THE Component_Library SHALL apply a State_Layer of 8% opacity on the component's content color for hover state on all interactive elements.
2. THE Component_Library SHALL apply a State_Layer of 10% opacity on the component's content color for focus state on all interactive elements.
3. THE Component_Library SHALL apply a State_Layer of 10% opacity on the component's content color for pressed/active state on all interactive elements.
4. THE Component_Library SHALL implement state layers as flat background-color transitions (not ripple effects) using `hsl(var(--token)/opacity)` pattern.

### Requirement 8: Deep Audit — Cursor States

**User Story:** As a developer, I want all components to display the appropriate cursor style for their current interaction state, so that users receive correct affordance cues.

#### Acceptance Criteria

1. THE Component_Library SHALL display `cursor-pointer` on all clickable interactive elements (buttons, links, menu items, chips, tabs, toggles, radio buttons, checkboxes).
2. WHEN a component is in disabled state, THE Component_Library SHALL display `cursor-not-allowed`.
3. WHERE a component supports drag interaction, THE Component_Library SHALL display `cursor-grab` in idle state and `cursor-grabbing` during active drag.
4. THE Component_Library SHALL display `cursor-default` on non-interactive containers and static text elements.
5. THE Component_Library SHALL display `cursor-text` on text input fields that accept user input.

### Requirement 9: Deep Audit — Animation and Motion Compliance

**User Story:** As a developer, I want all component animations and transitions to follow M3 Expressive motion specs (duration, easing), so that motion feels consistent and polished.

#### Acceptance Criteria

1. THE Component_Library SHALL use `cubic-bezier(0.2, 0, 0, 1)` (M3 standard) for enter/expand transitions and forward navigation.
2. THE Component_Library SHALL use `cubic-bezier(0.4, 0, 1, 1)` (M3 accelerate) for exit/collapse transitions and backward navigation.
3. THE Component_Library SHALL use `cubic-bezier(0, 0, 0, 1)` (M3 emphasized) for large-scale emphasized transitions (dialogs opening, full-screen transitions).
4. THE Component_Library SHALL use durations matching M3 motion guidelines: short (100ms) for state changes, medium (200ms–300ms) for content transitions, long (400ms–500ms) for large-scale layout shifts.
5. THE Component_Library SHALL ensure both opening and closing animations are equally smooth (no snapping in either direction).
6. THE Component_Library SHALL not use generic `ease`, `ease-in`, `ease-out`, or `linear` timing functions for component state transitions except where M3 explicitly specifies linear (e.g., opacity crossfades).
7. WHEN the user has `prefers-reduced-motion: reduce` enabled, THE Component_Library SHALL disable or minimize all animations per the existing `@media` rule in theme.css.

### Requirement 10: Collapsible Sidebar Animation Fix

**User Story:** As a developer, I want the docs site sidebar collapsible sections to animate smoothly in both opening and closing directions, so that the interaction feels polished and matches M3 motion principles.

#### Acceptance Criteria

1. WHEN a sidebar category is expanded, THE Docs_Site SHALL animate the content open with the same smoothness and duration as the close animation (no snapping).
2. THE Docs_Site SHALL use the M3 standard easing `cubic-bezier(0.2, 0, 0, 1)` for both expand and collapse transitions.
3. THE Docs_Site SHALL transition both `grid-template-rows` and `opacity` simultaneously with a duration of at least 200ms.

### Requirement 11: Deep Audit — Z-Index Layering

**User Story:** As a developer, I want all components to use consistent, correct z-index values, so that overlapping elements layer correctly without conflicts.

#### Acceptance Criteria

1. THE Component_Library SHALL use a consistent z-index scale: navigation/app-bar (z-30–z-40), overlays/scrim (z-50), dialogs/sheets (z-50+), tooltips (z-60), snackbar (z-70).
2. IF a component uses a z-index that causes layering conflicts or does not follow the M3 elevation hierarchy, THEN THE Component_Library SHALL be corrected.

### Requirement 12: Deep Audit — Font and Type Scale Usage in Components

**User Story:** As a developer, I want all components to use the correct M3 type scale role for their text content, so that typography is consistent with the design system.

#### Acceptance Criteria

1. THE Component_Library SHALL use `label-large` (14px/500) for button labels, chip labels, tab labels, and navigation labels per M3 specification.
2. THE Component_Library SHALL use `body-medium` (14px/400) for list item text, menu item text, and general content text per M3 specification.
3. THE Component_Library SHALL use `title-medium` (16px/500) for card titles, dialog titles, app-bar titles per M3 specification.
4. IF a component uses a font-size/weight/line-height combination that does not match the M3 type role specified for that component, THEN THE Component_Library SHALL be corrected.

### Requirement 13: Deep Audit — Tailwind CSS v4 Canonical Classes

**User Story:** As a developer, I want all components to use Tailwind CSS v4 canonical utility classes (no deprecated or bracket-only notation where a shorthand exists), so that there are no canonical class warnings at build time.

#### Acceptance Criteria

1. THE Component_Library SHALL use Tailwind_v4 semantic color classes (e.g., `bg-primary`, `text-surface-foreground`) defined in the `@theme` block instead of arbitrary `bg-[hsl(...)]` notation where a named utility exists.
2. THE Component_Library SHALL use Tailwind_v4 shorthand utilities (e.g., `rounded-full` instead of `rounded-[9999px]`, `h-10` instead of `h-[40px]`) wherever a standard utility provides the same value.
3. IF a component uses bracket notation for a value that has an equivalent Tailwind_v4 named utility, THEN THE Component_Library SHALL be corrected to use the canonical class.
4. THE Component_Library SHALL not produce Tailwind_v4 canonical class warnings during build.

### Requirement 14: Deep Audit — Touch Target Minimum Sizing

**User Story:** As a developer, I want all interactive components to meet M3 minimum touch target requirements, so that the UI is usable on touch devices and meets accessibility guidelines.

#### Acceptance Criteria

1. THE Component_Library SHALL ensure all interactive elements have a minimum touch target area of 48×48dp per M3 accessibility guidelines.
2. WHERE a visible component is smaller than 48×48dp (e.g., a 40px Icon Button), THE Component_Library SHALL provide invisible padding or hit area expansion to meet the 48dp minimum.
3. THE Component_Library SHALL maintain at least 8dp spacing between adjacent touch targets to prevent accidental activation.

### Requirement 15: Deep Audit — Transition Property Specificity

**User Story:** As a developer, I want all component transitions to target specific properties rather than using `transition-all`, so that performance is optimized and unintended property animations are avoided.

#### Acceptance Criteria

1. THE Component_Library SHALL use specific transition properties (e.g., `transition-colors`, `transition-opacity`, `transition-transform`) instead of `transition-all` on all interactive elements.
2. THE Component_Library SHALL ensure hover/focus/active state transitions target only the properties that change (background-color, opacity, transform, box-shadow) and not unrelated properties.
3. IF a component uses `transition-all` or `transition` without specifying properties, THEN THE Component_Library SHALL be corrected to specify only the relevant transition properties.

### Requirement 16: Deep Audit — Disabled State Visual Treatment

**User Story:** As a developer, I want all disabled components to follow the exact M3 disabled visual treatment, so that disabled states are clear and consistent across the system.

#### Acceptance Criteria

1. WHEN a component is disabled, THE Component_Library SHALL apply 38% opacity to content (text, icon) per M3 disabled specification.
2. WHEN a component with a container is disabled, THE Component_Library SHALL apply 12% opacity of `on-surface` color as the container fill per M3.
3. WHEN a component is disabled, THE Component_Library SHALL remove all elevation (shadow) from the component.
4. WHEN a component is disabled, THE Component_Library SHALL suppress all state layer interactions (no hover, focus, or press effects).
5. WHEN a component is disabled, THE Component_Library SHALL apply `pointer-events-none` in addition to `cursor-not-allowed` for full interaction prevention.

### Requirement 17: Deep Audit — Content Overflow and Truncation

**User Story:** As a developer, I want all components to handle text overflow gracefully per M3 patterns, so that long content does not break layouts.

#### Acceptance Criteria

1. THE Component_Library SHALL apply single-line truncation (`truncate`) on button labels, chip labels, tab labels, and navigation item labels that exceed available space.
2. THE Component_Library SHALL apply multi-line content clipping on card descriptions, list item secondary text, and tooltip content per M3 max-lines guidance.
3. THE Component_Library SHALL ensure truncated text shows the full content via tooltip on hover where applicable.

### Requirement 18: Deep Audit — Focus Ring and Keyboard Navigation

**User Story:** As a developer, I want all interactive components to show proper focus indicators for keyboard navigation per M3 and WCAG 2.2, so that keyboard users can navigate the UI effectively.

#### Acceptance Criteria

1. THE Component_Library SHALL display a focus ring (3px offset, `primary` color) on all interactive elements when focused via keyboard (`focus-visible`).
2. THE Component_Library SHALL not display a focus ring on mouse/touch interaction (using `focus-visible` not `focus`).
3. THE Component_Library SHALL ensure focus rings have at least 3:1 contrast ratio against adjacent colors per WCAG 2.2 Success Criterion 2.4.13.
4. THE Component_Library SHALL support logical tab order within composite components (e.g., radio groups, tab lists, menu items) using appropriate `tabIndex` management.

### Requirement 19: Deep Audit — Iconography Sizing and Alignment

**User Story:** As a developer, I want all icons within components to use the correct M3 icon sizes and be vertically centered with adjacent text, so that icon usage is consistent and aligned.

#### Acceptance Criteria

1. THE Component_Library SHALL use 18dp icons for small components (small chips, dense lists), 20dp for medium components (buttons, standard list items), and 24dp for large components (FAB, navigation items, app bars) per M3 iconography guidelines.
2. THE Component_Library SHALL vertically center-align icons with adjacent text labels using `items-center` flexbox alignment.
3. IF a component uses an icon size that does not match the M3 specification for that component size variant, THEN THE Component_Library SHALL be corrected.

### Requirement 20: Deep Audit — Component Density and Size Variants

**User Story:** As a developer, I want all components that support size variants to use the correct M3 Expressive dimensions for each size, so that density options are spec-compliant.

#### Acceptance Criteria

1. THE Component_Library SHALL implement size variants using the naming convention xs, s, m, l, xl where m is the default density.
2. THE Component_Library SHALL use the following M3 Expressive height values for buttons: xs=32px, s=36px, m=40px, l=48px, xl=56px.
3. THE Component_Library SHALL scale internal padding, icon size, and font-size proportionally across size variants per M3 density guidance.
4. IF a component offers size variants with dimensions that do not match M3 Expressive specifications, THEN THE Component_Library SHALL be corrected.

### Requirement 21: Deep Audit — No Ripple Effect Verification

**User Story:** As a developer, I want to confirm that no component in the library uses a ripple effect (as the library uses flat state layers), so that the interaction model is consistent.

#### Acceptance Criteria

1. THE Component_Library SHALL not implement any ripple animation or expanding-circle effect on interaction.
2. IF any component implements a ripple-style expanding animation for press feedback, THEN THE Component_Library SHALL be corrected to use flat state layers.

### Requirement 22: Deep Audit — Scrim (Overlay) Opacity and Color

**User Story:** As a developer, I want all overlay/scrim backgrounds to use the correct M3 opacity and color specification, so that modal backdrops are visually consistent.

#### Acceptance Criteria

1. THE Component_Library SHALL use a scrim color of `on-surface` at 32% opacity (0.32) for dialog and sheet overlays per M3 specification.
2. THE Component_Library SHALL apply the scrim across the full viewport with the correct z-index layering (below the dialog, above page content).
3. IF a component uses a scrim with a different opacity or color than M3 specifies, THEN THE Component_Library SHALL be corrected.

### Requirement 23: Deep Audit — Component Composability and Reuse

**User Story:** As a developer, I want M3 components to be composed of other M3 components from the library where appropriate, so that sub-elements are consistent, reusable, and avoid duplicating component logic.

#### Acceptance Criteria

1. WHEN a component renders a close button (e.g., Dialog, Side Sheet, Bottom Sheet, Snackbar), THE Component_Library SHALL use the MUI `IconButton` component internally rather than a custom button implementation.
2. WHEN a component renders action buttons (e.g., Dialog footer, Snackbar action), THE Component_Library SHALL use the MUI `Button` component internally.
3. WHEN a component renders an icon (e.g., Button with leading/trailing icon, Chip with icon, List item icon), THE Component_Library SHALL use the MUI `Icon` component internally.
4. WHERE Navigation Rail and Navigation Bar share similar item patterns, THE Component_Library SHALL reuse common sub-components or composition patterns rather than duplicating item rendering logic.
5. THE Component_Library SHALL not create inline ad-hoc implementations of elements (buttons, icons, badges) when an equivalent exported MUI component exists.
6. IF a component renders a sub-element that duplicates the behavior of an existing MUI component, THEN THE Component_Library SHALL be refactored to use the existing MUI component internally.
