# Requirements Document

## Introduction

This document specifies the requirements for rebuilding all Material Design 3 (M3) button components for the Strata web application. The scope covers the complete M3 button family: common buttons (Filled, Outlined, Text, Elevated, Tonal), icon buttons (Standard, Filled, Filled Tonal, Outlined), and Floating Action Buttons (FAB — small, regular, large, and extended). These components replace the existing single `Button` component with a fully M3-compliant button system that respects the M3 interaction model (state layers), shape system (rounded corners per M3 spec), typography scale, and accessibility requirements. The implementation uses the existing project stack: React 19, Tailwind CSS v4, `class-variance-authority`, `@radix-ui/react-slot`, `cn()` utility, and Material Symbols icons.

## Glossary

- **Button_Component**: The rebuilt M3 common button component supporting Filled, Outlined, Text, Elevated, and Tonal variants, installed at `apps/web/src/components/ui/button.tsx`.
- **IconButton_Component**: The M3 icon button component supporting Standard, Filled, Filled Tonal, and Outlined variants, installed at `apps/web/src/components/ui/icon-button.tsx`.
- **FAB_Component**: The M3 Floating Action Button component supporting small, medium (regular), large, and extended sizes, installed at `apps/web/src/components/ui/fab.tsx`.
- **State_Layer**: The M3 interaction feedback model using semi-transparent overlays on interactive elements — hover at 8% opacity, focus at 12% opacity, and press at 12% opacity of the component's on-color.
- **M3_Shape**: The Material Design 3 shape system defining corner radii — Full (9999px for pill shapes), Extra Large (28px), Large (16px), Medium (12px), Small (8px).
- **M3_Elevation**: Surface elevation expressed through shadow and/or surface-tint opacity (Level 0 through Level 5 as defined in the existing Theme_System).
- **M3_Typography**: The Material Design 3 type scale; buttons use Label Large (14px, 500 weight, 20px line-height, 0.1px letter-spacing).
- **Touch_Target**: The minimum interactive area for accessible touch/click interaction, at least 48×48 CSS pixels per M3 guidelines.
- **asChild_Pattern**: The Radix UI Slot pattern allowing a component to render as its child element, enabling composition with links and other elements.
- **Theme_System**: The existing CSS variable layer in `globals.css` defining M3 color tokens mapped to Tailwind utilities (primary, on-primary, secondary-container, etc.).
- **Icon**: The existing `Icon` component using Material Symbols Rounded font for rendering icons.
- **SegmentedButtonGroup_Component**: The M3 segmented button group component supporting icon-only, icon+label, and label-only configurations with single or multi-select behavior, installed at `apps/web/src/components/ui/segmented-button-group.tsx`.
- **cn_Utility**: The existing `cn()` function combining `clsx` with `tailwind-merge` for conditional, conflict-free class merging.

## Requirements

### Requirement 1: Common Button Variants (Filled, Outlined, Text, Elevated, Tonal)

**User Story:** As a developer, I want a single Button component with all five M3 button variants, so that I can apply the correct visual emphasis level (primary, secondary, tertiary) in any UI context.

#### Acceptance Criteria

1. THE Button_Component SHALL support the following variants: `filled`, `outlined`, `text`, `elevated`, and `tonal`.
2. WHEN the variant is `filled`, THE Button_Component SHALL render with a `primary` background color, `on-primary` text color, and M3 Elevation Level 0 at rest (no shadow), rising to Level 1 on hover.
3. WHEN the variant is `outlined`, THE Button_Component SHALL render with a transparent background, a 1px `outline` border, and `primary` text color.
4. WHEN the variant is `text`, THE Button_Component SHALL render with a transparent background, no border, and `primary` text color.
5. WHEN the variant is `elevated`, THE Button_Component SHALL render with a `surface-container-low` background color, `primary` text color, and M3 Elevation Level 1 at rest, rising to Level 2 on hover.
6. WHEN the variant is `tonal`, THE Button_Component SHALL render with a `secondary-container` background color, `on-secondary-container` text color, and M3 Elevation Level 0 at rest, rising to Level 1 on hover.
7. THE Button_Component SHALL default to the `filled` variant when no variant prop is provided.
8. THE Button_Component SHALL apply M3 Label Large typography: 14px font size, 500 font weight, 20px line-height, and 0.1px letter-spacing.
9. THE Button_Component SHALL support a `size` prop with the following values: `small` (34px height, 16px horizontal padding), `medium` (40px height, 24px horizontal padding, default), `large` (48px height, 28px horizontal padding), and `extra-large` (56px height, 32px horizontal padding).
10. THE Button_Component SHALL use the M3 Full shape (border-radius 9999px) for all variants and sizes, producing a pill-shaped button.
11. THE Button_Component SHALL default to `medium` size when no size prop is provided.

### Requirement 2: Common Button State Layer Interactions

**User Story:** As a user, I want clear visual feedback when I hover, focus, or press a button, so that I understand the button is interactive and responding to my input.

#### Acceptance Criteria

1. WHEN the user hovers over the Button_Component, THE Button_Component SHALL display a State_Layer using the button's on-color at 8% opacity over the entire button surface.
2. WHEN the Button_Component receives keyboard focus, THE Button_Component SHALL display a State_Layer using the button's on-color at 12% opacity and a visible focus ring.
3. WHEN the user presses (mousedown/touchstart) the Button_Component, THE Button_Component SHALL display a State_Layer using the button's on-color at 12% opacity.
4. WHILE the Button_Component is disabled, THE Button_Component SHALL reduce its overall opacity to 38%, remove interactive cursor styling, and prevent all pointer events.
5. THE Button_Component SHALL transition between states with a 200ms duration using the M3 standard easing curve (cubic-bezier(0.2, 0, 0, 1)).

### Requirement 3: Common Button Icon Support

**User Story:** As a developer, I want buttons that can include a leading or trailing icon alongside text, so that I can provide visual context for the button's action.

#### Acceptance Criteria

1. THE Button_Component SHALL accept an optional `icon` prop (React node) that renders a leading icon before the button label.
2. THE Button_Component SHALL accept an optional `trailingIcon` prop (React node) that renders a trailing icon after the button label.
3. WHEN an icon is present, THE Button_Component SHALL use 16px horizontal padding on the icon side and 24px on the opposite side for `medium` size, scaling proportionally for other sizes (12px/16px for `small`, 20px/28px for `large`, 24px/32px for `extra-large`).
4. WHEN an icon is present, THE Button_Component SHALL space the icon 8px from the label text.
5. THE Button_Component SHALL constrain icon sizing within the button to 18px × 18px for `small` and `medium` sizes, and 20px × 20px for `large` and `extra-large` sizes.

### Requirement 4: Icon Buttons (Standard, Filled, Filled Tonal, Outlined)

**User Story:** As a developer, I want dedicated icon-only button variants, so that I can place compact actions (like favorite, share, close) that rely on iconography rather than text labels.

#### Acceptance Criteria

1. THE IconButton_Component SHALL support the following variants: `standard`, `filled`, `filled-tonal`, and `outlined`.
2. WHEN the variant is `standard`, THE IconButton_Component SHALL render with a transparent background and `on-surface-variant` icon color.
3. WHEN the variant is `filled`, THE IconButton_Component SHALL render with a `primary` background color and `on-primary` icon color.
4. WHEN the variant is `filled-tonal`, THE IconButton_Component SHALL render with a `secondary-container` background color and `on-secondary-container` icon color.
5. WHEN the variant is `outlined`, THE IconButton_Component SHALL render with a transparent background, a 1px `outline` border, and `on-surface-variant` icon color.
6. THE IconButton_Component SHALL support a `size` prop with the following values: `small` (34px × 34px), `medium` (40px × 40px, default), `large` (48px × 48px), and `extra-large` (56px × 56px).
7. THE IconButton_Component SHALL use M3 Full shape (border-radius 9999px) by default for all sizes, producing a circular button.
8. THE IconButton_Component SHALL support a `shape` prop with values `round` (default, border-radius 9999px) and `square` (border-radius scaled per size: 8px for small, 12px for medium, 14px for large, 16px for extra-large).
9. THE IconButton_Component SHALL display a single icon centered at 24px × 24px for `medium` and `large` sizes, 20px × 20px for `small`, and 28px × 28px for `extra-large`.
10. WHEN the user presses the IconButton_Component, THE IconButton_Component SHALL morph the border-radius to a more square shape (reducing by approximately 30% from the resting radius) over a 100ms duration, returning to the resting radius on release.
11. THE IconButton_Component SHALL accept a `toggle` prop that enables toggle behavior (pressed/unpressed visual states).
12. WHEN `toggle` is enabled and the button is in the pressed state, THE IconButton_Component SHALL switch to the filled visual treatment (filled background with contrasting icon color).
13. WHEN `toggle` is enabled and the button is in the unpressed state, THE IconButton_Component SHALL use the standard visual treatment (transparent background with on-surface-variant icon color).
14. THE IconButton_Component SHALL apply the same State_Layer interaction model as the Button_Component (8% hover, 12% focus, 12% press).
15. THE IconButton_Component SHALL default to the `standard` variant and `medium` size when no props are provided.

### Requirement 5: Icon Button Accessibility

**User Story:** As a user relying on assistive technology, I want icon buttons to have proper accessible names, so that screen readers can convey the button's purpose without a visible text label.

#### Acceptance Criteria

1. THE IconButton_Component SHALL require an `aria-label` prop (or `aria-labelledby`) to provide an accessible name since no visible text label is present.
2. WHEN `toggle` is enabled, THE IconButton_Component SHALL set `aria-pressed` to reflect the current toggle state (true or false).
3. WHEN the IconButton_Component is disabled, THE IconButton_Component SHALL set `aria-disabled="true"` and remove the element from the tab order.
4. THE IconButton_Component SHALL be focusable via keyboard tab navigation and activatable via Enter or Space keys.

### Requirement 6: Floating Action Buttons (FAB)

**User Story:** As a developer, I want Floating Action Button components in multiple sizes, so that I can provide prominent primary actions that float above the UI content.

#### Acceptance Criteria

1. THE FAB_Component SHALL support sizes: `small`, `medium` (default), `large`, and `extended`.
2. WHEN size is `small`, THE FAB_Component SHALL render at 40px × 40px with M3 Medium shape (border-radius 12px) and a 24px icon.
3. WHEN size is `medium`, THE FAB_Component SHALL render at 56px × 56px with M3 Large shape (border-radius 16px) and a 24px icon.
4. WHEN size is `large`, THE FAB_Component SHALL render at 96px × 96px with M3 Extra Large shape (border-radius 28px) and a 36px icon.
5. WHEN size is `extended`, THE FAB_Component SHALL render at 56px height with M3 Large shape (border-radius 16px), a 24px leading icon, a text label in Label Large typography, and horizontal padding of 16px on the icon side and 20px on the text trailing side.
6. THE FAB_Component SHALL support color variants: `primary` (primary-container background, on-primary-container icon/text), `secondary` (secondary-container background, on-secondary-container icon/text), `tertiary` (tertiary-container background, on-tertiary-container icon/text), and `surface` (surface-container-high background, primary icon/text).
7. THE FAB_Component SHALL render at M3 Elevation Level 3 at rest, rising to Level 4 on hover.
8. THE FAB_Component SHALL apply the same State_Layer interaction model as other button types (8% hover, 12% focus, 12% press of the respective on-color).
9. THE FAB_Component SHALL support a `shape` prop with values `rounded` (default, using the size-specific border-radius above) and `round` (border-radius 9999px, producing a fully circular FAB for small/medium/large sizes).
10. WHEN the user presses the FAB_Component, THE FAB_Component SHALL morph the border-radius toward a more square shape (reducing by approximately 20-30% from the resting radius) over 100ms, returning to the resting radius on release — consistent with the M3 Expressive pressed-state shape morph.
11. THE FAB_Component SHALL default to size `medium`, color `primary`, and shape `rounded` when no props are provided.

### Requirement 7: FAB Accessibility and Positioning

**User Story:** As a user, I want FABs to be accessible and consistently positioned, so that I can discover and use the primary action regardless of my input method.

#### Acceptance Criteria

1. THE FAB_Component SHALL require an `aria-label` prop when size is not `extended` (icon-only variants have no visible text).
2. WHEN size is `extended`, THE FAB_Component SHALL derive its accessible name from the visible label text.
3. THE FAB_Component SHALL be focusable via keyboard tab navigation and activatable via Enter or Space keys.
4. THE FAB_Component SHALL support a `fixed` prop that positions the FAB at a fixed viewport location (default: bottom-right with 16px margin from edges).
5. WHEN the `fixed` prop is active and the viewport width is below 768px, THE FAB_Component SHALL position itself 16px above the mobile navigation bar to avoid overlap.

### Requirement 8: Button Composition and Polymorphism

**User Story:** As a developer, I want buttons that can render as different HTML elements (links, router components), so that I can use button styling on navigation elements without sacrificing semantics.

#### Acceptance Criteria

1. THE Button_Component SHALL accept an `asChild` prop that, when true, renders the button styles onto the immediate child element using the asChild_Pattern (Radix Slot).
2. THE IconButton_Component SHALL accept an `asChild` prop with the same behavior as the Button_Component.
3. THE FAB_Component SHALL accept an `asChild` prop with the same behavior as the Button_Component.
4. WHEN `asChild` is true, THE component SHALL merge its className, event handlers, and ARIA attributes onto the child element without rendering an additional wrapper.
5. THE Button_Component SHALL forward refs to the underlying DOM element for imperative access.
6. THE IconButton_Component SHALL forward refs to the underlying DOM element for imperative access.
7. THE FAB_Component SHALL forward refs to the underlying DOM element for imperative access.

### Requirement 9: Responsive Touch Targets

**User Story:** As a mobile user, I want buttons to be easy to tap without accidentally triggering adjacent actions, so that I can interact with the UI comfortably on touchscreens.

#### Acceptance Criteria

1. THE Button_Component SHALL maintain a minimum touch target of 48px × 48px, using transparent padding/margin when the visual size is smaller than 48px.
2. THE IconButton_Component SHALL maintain a minimum touch target of 48px × 48px; for `small` (34px) and `medium` (40px) sizes, the component SHALL include transparent padding to reach 48px. For `large` (48px) and `extra-large` (56px), the visual size already meets or exceeds the touch target.
3. THE FAB_Component (small size at 40px) SHALL maintain a minimum touch target of 48px × 48px using the same transparent padding strategy.
4. WHEN multiple icon buttons are placed in a row, THE IconButton_Component SHALL support a `compact` prop that removes the additional touch-target padding for dense toolbars, while logging an accessibility warning in development mode.

### Requirement 10: Disabled State

**User Story:** As a developer, I want a consistent disabled visual treatment across all button types, so that users can clearly identify which actions are unavailable.

#### Acceptance Criteria

1. WHILE the Button_Component is disabled, THE Button_Component SHALL render with 38% opacity on the entire element and prevent pointer interaction.
2. WHILE the IconButton_Component is disabled, THE IconButton_Component SHALL render the icon at 38% opacity of `on-surface` color and prevent pointer interaction.
3. WHILE the FAB_Component is disabled, THE FAB_Component SHALL render at 38% opacity and prevent pointer interaction.
4. WHILE any button component is disabled, THE component SHALL remove the element from the natural tab order (`tabIndex={-1}`).
5. WHILE the outlined variant of the Button_Component is disabled, THE Button_Component SHALL render the border at 12% opacity of `on-surface` instead of the normal outline color.
6. WHILE the elevated variant of the Button_Component is disabled, THE Button_Component SHALL remove the elevation shadow entirely.

### Requirement 11: Loading State

**User Story:** As a user, I want to see that a button action is in progress, so that I understand the system is working and I should wait.

#### Acceptance Criteria

1. THE Button_Component SHALL accept a `loading` prop (boolean) that indicates an action is in progress.
2. WHEN `loading` is true, THE Button_Component SHALL replace the leading icon (or prepend if no icon) with a spinner animation.
3. WHEN `loading` is true, THE Button_Component SHALL disable pointer interactions (same as disabled) but maintain full opacity so the loading indicator is clearly visible.
4. WHEN `loading` is true, THE Button_Component SHALL set `aria-busy="true"` to communicate the loading state to assistive technologies.
5. THE FAB_Component SHALL accept a `loading` prop with equivalent behavior to the Button_Component.

### Requirement 12: Button Group / Segmented Button Support

**User Story:** As a developer, I want to group related buttons together as a segmented control, so that users can select between multiple related options in a compact format.

#### Acceptance Criteria

1. A `SegmentedButtonGroup` component SHALL render as a container that visually connects adjacent segment items as a single cohesive unit.
2. THE SegmentedButtonGroup SHALL support three content configurations via children: `icon-only` (each segment contains only an icon), `icon-and-label` (each segment contains an icon and text label), and `label-only` (each segment contains only a text label).
3. WHEN segments are connected, THE SegmentedButtonGroup SHALL merge adjacent border-radii so that only the first segment has left-rounded corners (M3 Full shape on the left end) and the last segment has right-rounded corners (M3 Full shape on the right end), with inner segments having 0px border-radius.
4. THE SegmentedButtonGroup SHALL collapse shared borders between adjacent segments to a single 1px `outline` divider line.
5. THE SegmentedButtonGroup SHALL accept a `selectionMode` prop supporting `single` (default, radio-like behavior where exactly one segment is selected) and `multiple` (checkbox-like behavior where zero or more segments can be selected).
6. WHEN a segment is selected in `single` mode, THE segment SHALL display with a `secondary-container` background and `on-secondary-container` text/icon color, with a checkmark icon prepended before the label (or replacing the icon in icon-only mode).
7. WHEN a segment is selected in `multiple` mode, THE segment SHALL display the same selected visual treatment as single mode, with a checkmark icon prepended.
8. WHEN a segment is unselected, THE segment SHALL display with a transparent background, `on-surface` text/icon color, and no checkmark.
9. THE SegmentedButtonGroup SHALL accept a `size` prop supporting `medium` (default, 40px height) and `small` (32px height) for density control.
10. THE SegmentedButtonGroup SHALL accept an `equalWidth` prop (boolean, default true) that distributes all segments to equal widths within the container; when false, segments size to their content.
11. EACH segment within the group SHALL apply the same State_Layer interaction model as the Button_Component (8% hover, 12% focus, 12% press of `on-surface` or `on-secondary-container` depending on selection state).
12. THE SegmentedButtonGroup SHALL manage selection state internally via `value` (controlled) and `defaultValue` (uncontrolled) props, calling an `onValueChange` callback when selection changes.
13. WHEN a segment is disabled, THE segment SHALL render at 38% opacity, prevent pointer interaction, and be excluded from keyboard navigation within the group.
14. THE SegmentedButtonGroup SHALL support keyboard navigation: Arrow Left/Right to move focus between segments, Enter/Space to toggle selection, Home/End to jump to first/last segment.
15. THE SegmentedButtonGroup SHALL set `role="group"` on the container and `role="radio"` (single mode) or `role="checkbox"` (multiple mode) on each segment with appropriate `aria-checked` state.
16. THE SegmentedButtonGroup SHALL be installed at `apps/web/src/components/ui/segmented-button-group.tsx`.

### Requirement 13: Dark Mode Compatibility

**User Story:** As a user who prefers dark mode, I want all button variants to adapt correctly to the dark color scheme, so that buttons remain legible and visually consistent in dark environments.

#### Acceptance Criteria

1. WHEN the application is in dark mode (`.dark` class on root), THE Button_Component SHALL use the dark-mode values of all referenced M3 color tokens as defined in the Theme_System.
2. WHEN the application is in dark mode, THE FAB_Component elevation shadows SHALL use light surface-tint values (as defined by the dark-mode `--elevation-*` tokens).
3. THE Button_Component, IconButton_Component, and FAB_Component SHALL maintain WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI components) in both light and dark modes.

### Requirement 14: Reduced Motion Compliance

**User Story:** As a user with motion sensitivity, I want button transitions to be instant when I have reduced motion enabled, so that the interface does not trigger discomfort.

#### Acceptance Criteria

1. WHILE the user has `prefers-reduced-motion: reduce` active, THE Button_Component SHALL complete all state transitions (hover, focus, press, elevation changes) instantly with zero duration.
2. WHILE the user has `prefers-reduced-motion: reduce` active, THE loading spinner animation in all button components SHALL be replaced with a static loading indicator (such as an ellipsis or static icon).
3. WHILE the user has `prefers-reduced-motion: reduce` active, THE FAB_Component elevation transitions SHALL be instant.

