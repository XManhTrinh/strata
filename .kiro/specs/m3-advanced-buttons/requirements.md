# Requirements Document

## Introduction

This document specifies the requirements for three new M3 Expressive button components that extend the existing Material Design 3 button system in the Strata web application. The scope covers: **Extended FAB** (a labeled floating action button available in Small, Medium, and Large sizes with Title Medium typography), **FAB Menu** (a speed-dial overlay of 2–6 action items that opens from a FAB), and **Split Button** (a composite button group with a leading action button and a trailing menu trigger). These components build on the existing FAB and Button implementations and share the same token system, state layer model, CVA architecture, and accessibility patterns already established in the `m3-buttons` spec.

## Glossary

- **ExtendedFAB_Component**: The M3 Extended Floating Action Button component supporting Small (56dp), Medium (80dp), and Large (96dp) sizes with icon + label content, installed at `apps/web/src/components/ui/extended-fab.tsx`.
- **FABMenu_Component**: The M3 FAB Menu component that opens from a FAB to display 2–6 related action items in a floating overlay, installed at `apps/web/src/components/ui/fab-menu.tsx`.
- **SplitButton_Component**: The M3 Split Button component composed of a leading action button and a trailing menu-toggle button separated by a 2dp inner gap, installed at `apps/web/src/components/ui/split-button.tsx`.
- **FAB_Component**: The existing M3 Floating Action Button component (from the `m3-buttons` spec) that the FABMenu_Component anchors to.
- **Button_Component**: The existing M3 common button component (from the `m3-buttons` spec) whose variants and size scale the SplitButton_Component inherits.
- **State_Layer**: The M3 interaction feedback model using semi-transparent overlays — hover at 8% opacity, focus at 10% opacity, and press at 10% opacity of the component's on-color (matching the FAB/Icon Button pattern).
- **M3_Shape**: The Material Design 3 shape system — Full (9999px), Extra Large (28px), Large (16px), Medium (12px), Small (8px).
- **M3_Elevation**: Surface elevation expressed through shadow tokens (Level 0 through Level 5 as defined in the Theme_System).
- **M3_Typography_Title_Medium**: The M3 type scale token for Title Medium — 16px font size, 500 font weight, 24px line-height, 0.15px letter-spacing.
- **Theme_System**: The existing CSS custom property layer in `globals.css` defining M3 color, shape, elevation, and state tokens mapped to Tailwind utilities.
- **Inner_Corner_Radius**: The smaller border-radius applied to the adjacent inner edges of the leading and trailing segments of the SplitButton_Component — distinct from the outer corner radius.
- **Motion_Library**: The `motion` (Framer Motion) package available in the project for orchestrating entry/exit animations.
- **Touch_Target**: The minimum interactive area of 48×48 CSS pixels per M3 accessibility guidelines.
- **cn_Utility**: The existing `cn()` function combining `clsx` with `tailwind-merge` for conditional, conflict-free class merging.
- **CVA**: The `class-variance-authority` library used for declarative variant styling in each component.

## Requirements

### Requirement 1: Extended FAB Sizes and Layout

**User Story:** As a developer, I want Extended FAB components in three expressive sizes (Small, Medium, Large), so that I can place a labeled primary action at appropriate visual weight for the surrounding UI context.

#### Acceptance Criteria

1. THE ExtendedFAB_Component SHALL support a `size` prop with values `small` (56dp height), `medium` (80dp height), and `large` (96dp height).
2. THE ExtendedFAB_Component SHALL default to size `medium` when no size prop is provided.
3. THE ExtendedFAB_Component SHALL render both a leading icon and a label text within the container for all sizes.
4. THE ExtendedFAB_Component SHALL constrain the leading icon to 24dp × 24dp for all sizes.
5. THE ExtendedFAB_Component SHALL apply 16dp horizontal padding on both the leading and trailing edges of the container.
6. THE ExtendedFAB_Component SHALL use M3 Large shape (border-radius 16dp) for all sizes.
7. THE ExtendedFAB_Component SHALL maintain a minimum width of 80dp regardless of label content length.
8. THE ExtendedFAB_Component SHALL expand its width dynamically based on label text content beyond the minimum width.

### Requirement 2: Extended FAB Typography

**User Story:** As a designer, I want Extended FABs to use Title Medium typography (not Label Large), so that the labeled FAB visually differentiates from standard buttons and aligns with the M3 Expressive spec.

#### Acceptance Criteria

1. THE ExtendedFAB_Component SHALL apply M3_Typography_Title_Medium: 16px font size, 500 font weight, 24px line-height, and 0.15px letter-spacing to the label text.
2. THE ExtendedFAB_Component SHALL space the label text 16dp from the leading icon.

### Requirement 3: Extended FAB Color Variants

**User Story:** As a developer, I want Extended FABs with multiple color options, so that I can match the FAB's emphasis to the page's color hierarchy.

#### Acceptance Criteria

1. THE ExtendedFAB_Component SHALL support a `color` prop with values: `primary` (primary-container background, on-primary-container foreground), `secondary` (secondary-container background, on-secondary-container foreground), and `tertiary` (tertiary-container background, on-tertiary-container foreground).
2. THE ExtendedFAB_Component SHALL default to `primary` color when no color prop is provided.
3. THE ExtendedFAB_Component SHALL also support `primary-fixed` (primary background, on-primary foreground), `secondary-fixed` (secondary background, on-secondary foreground), and `tertiary-fixed` (tertiary background, on-tertiary foreground) color values for non-container color use.

### Requirement 4: Extended FAB States and Elevation

**User Story:** As a user, I want clear visual feedback when interacting with an Extended FAB, so that I understand the action target is responding to my input.

#### Acceptance Criteria

1. THE ExtendedFAB_Component SHALL render at M3 Elevation Level 3 at rest.
2. WHEN the user hovers over the ExtendedFAB_Component, THE ExtendedFAB_Component SHALL rise to M3 Elevation Level 4.
3. WHEN the user hovers over the ExtendedFAB_Component, THE ExtendedFAB_Component SHALL display a State_Layer at 8% opacity of the on-color.
4. WHEN the ExtendedFAB_Component receives keyboard focus, THE ExtendedFAB_Component SHALL display a State_Layer at 10% opacity of the on-color and a visible focus ring.
5. WHEN the user presses the ExtendedFAB_Component, THE ExtendedFAB_Component SHALL display a State_Layer at 10% opacity of the on-color.
6. THE ExtendedFAB_Component SHALL transition between states with a 200ms duration using the M3 standard easing curve (cubic-bezier(0.2, 0, 0, 1)).

### Requirement 5: Extended FAB Accessibility and Positioning

**User Story:** As a user relying on assistive technology, I want the Extended FAB to have a proper accessible name and be keyboard-navigable, so that I can discover and activate the primary action.

#### Acceptance Criteria

1. THE ExtendedFAB_Component SHALL derive its accessible name from the visible label text (no separate aria-label required when label is present).
2. THE ExtendedFAB_Component SHALL be focusable via keyboard tab navigation and activatable via Enter or Space keys.
3. WHILE the ExtendedFAB_Component is disabled, THE ExtendedFAB_Component SHALL render at 38% opacity, prevent pointer interaction, and be removed from the tab order.
4. THE ExtendedFAB_Component SHALL support a `fixed` prop that positions the component at a fixed viewport location with 16dp margins from edges.
5. WHEN the `fixed` prop is active and the viewport width is below 768px, THE ExtendedFAB_Component SHALL position itself 16dp above the mobile navigation bar to avoid overlap.
6. THE ExtendedFAB_Component SHALL maintain a minimum touch target of 48px × 48px (the Small size at 56dp already exceeds this).

### Requirement 6: Extended FAB Composition

**User Story:** As a developer, I want the Extended FAB to support the asChild pattern and ref forwarding, so that I can use it with router links and access the DOM imperatively.

#### Acceptance Criteria

1. THE ExtendedFAB_Component SHALL accept an `asChild` prop that, when true, renders the component styles onto the immediate child element using the Radix Slot pattern.
2. WHEN `asChild` is true, THE ExtendedFAB_Component SHALL merge className, event handlers, and ARIA attributes onto the child element without rendering an additional wrapper.
3. THE ExtendedFAB_Component SHALL forward refs to the underlying DOM element for imperative access.

### Requirement 7: FAB Menu Structure and Behavior

**User Story:** As a developer, I want a FAB Menu component that opens from a FAB to display related actions, so that users can access secondary actions without cluttering the main UI.

#### Acceptance Criteria

1. THE FABMenu_Component SHALL display between 2 and 6 menu item actions when opened.
2. THE FABMenu_Component SHALL include a close button (56dp, circular) that uses a contrasting color from the menu items.
3. THE FABMenu_Component SHALL render menu items using medium button specs (48dp height each).
4. WHEN the FABMenu_Component is opened, THE close button SHALL replace the triggering FAB at the same position (sharing the top trailing corner as anchor point).
5. THE FABMenu_Component SHALL open from the top trailing edge of the FAB for smooth directional animation.
6. THE FABMenu_Component SHALL maintain 16dp margins from viewport edges when positioning the menu.

### Requirement 8: FAB Menu Color Variants

**User Story:** As a designer, I want FAB Menu color sets that contrast the close button with the item list, so that the close affordance is visually distinct from the action items.

#### Acceptance Criteria

1. THE FABMenu_Component SHALL support a `colorSet` prop with values: `primary`, `secondary`, and `tertiary`.
2. WHEN colorSet is `primary`, THE close button SHALL use primary-container background with on-primary-container foreground, and menu items SHALL use a contrasting surface color with primary text.
3. WHEN colorSet is `secondary`, THE close button SHALL use secondary-container background with on-secondary-container foreground, and menu items SHALL use a contrasting surface color with secondary text.
4. WHEN colorSet is `tertiary`, THE close button SHALL use tertiary-container background with on-tertiary-container foreground, and menu items SHALL use a contrasting surface color with tertiary text.
5. THE FABMenu_Component SHALL default to the `primary` colorSet when no colorSet prop is provided.

### Requirement 9: FAB Menu Animation

**User Story:** As a user, I want the FAB Menu to open and close with smooth, directional animation, so that I understand the spatial relationship between the FAB and its menu.

#### Acceptance Criteria

1. WHEN the FABMenu_Component opens, THE menu items SHALL animate in sequentially from the FAB anchor point with staggered entry (each item delayed by 50ms from the previous).
2. WHEN the FABMenu_Component closes, THE menu items SHALL animate out in reverse order back toward the FAB anchor point.
3. THE FABMenu_Component SHALL use the Motion_Library for orchestrating entry and exit animations.
4. THE FABMenu_Component SHALL maintain a 4dp gap between the FAB anchor and the first menu item.
5. WHILE the user has `prefers-reduced-motion: reduce` active, THE FABMenu_Component SHALL open and close instantly without staggered animation (items appear/disappear simultaneously with zero duration).

### Requirement 10: FAB Menu Interaction and Dismissal

**User Story:** As a user, I want intuitive ways to open, navigate, and dismiss the FAB Menu, so that I can efficiently access or reject the available actions.

#### Acceptance Criteria

1. WHEN the user activates the triggering FAB (click, Enter, or Space), THE FABMenu_Component SHALL open and display the menu items.
2. WHEN the user activates the close button (click, Enter, or Space), THE FABMenu_Component SHALL close.
3. WHEN the user presses Escape while the FABMenu_Component is open, THE FABMenu_Component SHALL close and return focus to the triggering FAB.
4. WHEN the user clicks outside the FABMenu_Component while it is open, THE FABMenu_Component SHALL close.
5. WHEN the FABMenu_Component is open, THE component SHALL trap focus within the menu (close button and menu items) until dismissed.
6. WHEN the FABMenu_Component is open, THE user SHALL be able to navigate between the close button and menu items using Arrow Up/Down keys.
7. WHEN the user activates a menu item, THE FABMenu_Component SHALL close after executing the item's action callback.

### Requirement 11: FAB Menu Accessibility

**User Story:** As a user relying on assistive technology, I want the FAB Menu to announce its purpose and state, so that I can understand and navigate the available actions.

#### Acceptance Criteria

1. THE triggering FAB SHALL have `aria-haspopup="menu"` to indicate it opens a menu.
2. WHEN the FABMenu_Component is open, THE triggering FAB SHALL have `aria-expanded="true"`.
3. WHEN the FABMenu_Component is closed, THE triggering FAB SHALL have `aria-expanded="false"`.
4. THE FABMenu_Component overlay SHALL have `role="menu"` and each menu item SHALL have `role="menuitem"`.
5. THE close button SHALL have an accessible label of "Close menu" (or localized equivalent via prop).
6. EACH menu item SHALL require either visible label text or an `aria-label` prop to provide an accessible name.

### Requirement 12: FAB Menu Constraints

**User Story:** As a developer, I want clear constraints on FAB Menu usage, so that I follow the M3 spec guidance and avoid incorrect combinations.

#### Acceptance Criteria

1. THE FABMenu_Component SHALL accept only components matching the menu item interface as children (2–6 items).
2. IF fewer than 2 or more than 6 menu items are provided, THEN THE FABMenu_Component SHALL log a development-mode warning and render the valid subset (first 6 items, or nothing if fewer than 2).
3. THE FABMenu_Component SHALL accept a FAB (from the existing FAB_Component) as its trigger — Extended FABs are not supported as triggers.
4. IF an Extended FAB is provided as the trigger, THEN THE FABMenu_Component SHALL log a development-mode warning.

### Requirement 13: Split Button Structure and Sizes

**User Story:** As a developer, I want a Split Button component with a leading action and a trailing menu trigger, so that users can perform a primary action or choose from alternatives.

#### Acceptance Criteria

1. THE SplitButton_Component SHALL render as a composite of two adjacent segments: a leading action button and a trailing menu-trigger button.
2. THE SplitButton_Component SHALL maintain a 2dp inner gap between the leading and trailing segments.
3. THE SplitButton_Component SHALL support a `size` prop with values: `xs` (32dp height), `s` (40dp height), `m` (48dp height), `l` (56dp height), and `xl` (64dp height).
4. THE SplitButton_Component SHALL default to size `m` when no size prop is provided.
5. THE leading segment SHALL support optional icon, label text, or both (icon + label).
6. THE trailing segment SHALL always display a menu icon (chevron/arrow_drop_down).

### Requirement 14: Split Button Corner Radii

**User Story:** As a designer, I want Split Button corners to follow the M3 spec precisely — outer corners use the button shape, inner corners use a smaller radius — so that the two segments visually form a cohesive pair.

#### Acceptance Criteria

1. THE SplitButton_Component SHALL apply the standard M3 Full shape (border-radius 9999px) to the outer corners (leading segment left corners and trailing segment right corners).
2. THE SplitButton_Component SHALL apply inner corner radii per size: `xs` 4dp, `s` 4dp, `m` 4dp, `l` 8dp, `xl` 12dp to the adjacent inner edges (leading segment right corners and trailing segment left corners).
3. WHEN the user hovers over or focuses a segment, THE inner corners of that segment SHALL transition to a more rounded shape (increasing toward full radius) over 200ms using the M3 standard easing curve.
4. WHEN the user presses a segment, THE inner corners of that segment SHALL transition to a more rounded shape (same target as hover/focus).

### Requirement 15: Split Button Color Variants

**User Story:** As a developer, I want Split Button color variants matching regular buttons, so that I can visually integrate split buttons with the rest of the button system.

#### Acceptance Criteria

1. THE SplitButton_Component SHALL support a `variant` prop with values: `elevated`, `filled`, `tonal`, and `outlined`.
2. WHEN variant is `filled`, THE SplitButton_Component SHALL render both segments with primary background and on-primary foreground.
3. WHEN variant is `tonal`, THE SplitButton_Component SHALL render both segments with secondary-container background and on-secondary-container foreground.
4. WHEN variant is `outlined`, THE SplitButton_Component SHALL render both segments with transparent background, outline border on outer edges, and primary foreground.
5. WHEN variant is `elevated`, THE SplitButton_Component SHALL render both segments with surface-container-low background, primary foreground, and M3 Elevation Level 1.
6. THE SplitButton_Component SHALL default to the `tonal` variant when no variant prop is provided.
7. WHEN the trailing segment is in the selected/open state, THE SplitButton_Component SHALL apply the state layer but SHALL NOT change the base color of either segment.

### Requirement 16: Split Button Trailing Segment Icon Behavior

**User Story:** As a user, I want the trailing menu icon to animate when the menu opens, so that I get a visual cue that the menu state has changed.

#### Acceptance Criteria

1. WHEN the menu is closed (unselected), THE trailing segment icon SHALL be offset from center: `xs` -1dp, `s` -1dp, `m` -2dp, `l` -3dp, `xl` -6dp (shifted toward the leading segment).
2. WHEN the menu is open (selected), THE trailing segment icon SHALL animate to the centered position within the trailing segment.
3. WHEN the menu transitions between open and closed states, THE trailing segment icon SHALL rotate 180 degrees (spin/morph animation).
4. THE icon animation SHALL use a 200ms duration with the M3 standard easing curve (cubic-bezier(0.2, 0, 0, 1)).
5. WHILE the user has `prefers-reduced-motion: reduce` active, THE icon rotation and offset transitions SHALL complete instantly with zero duration.

### Requirement 17: Split Button State Layer Interactions

**User Story:** As a user, I want independent hover/focus/press feedback on each segment of the Split Button, so that I know which segment I am targeting.

#### Acceptance Criteria

1. WHEN the user hovers over the leading segment, THE leading segment SHALL display a State_Layer at 8% opacity; the trailing segment SHALL remain unaffected.
2. WHEN the user hovers over the trailing segment, THE trailing segment SHALL display a State_Layer at 8% opacity; the leading segment SHALL remain unaffected.
3. WHEN a segment receives keyboard focus, THE focused segment SHALL display a State_Layer at 10% opacity and a visible focus ring.
4. WHEN the user presses a segment, THE pressed segment SHALL display a State_Layer at 10% opacity.
5. THE SplitButton_Component SHALL use the same 200ms transition duration and M3 standard easing curve for state layer opacity transitions.

### Requirement 18: Split Button Menu Integration

**User Story:** As a developer, I want the trailing segment to control a dropdown menu, so that users can discover alternative actions related to the primary button action.

#### Acceptance Criteria

1. WHEN the user activates the trailing segment (click, Enter, or Space), THE SplitButton_Component SHALL toggle the associated dropdown menu open or closed.
2. THE SplitButton_Component SHALL accept a `menuContent` prop (React node) that renders as the dropdown menu content when the trailing segment is activated.
3. WHEN the menu is open and the user presses Escape, THE SplitButton_Component SHALL close the menu and return focus to the trailing segment.
4. WHEN the menu is open and the user clicks outside both the menu and the button, THE SplitButton_Component SHALL close the menu.
5. THE dropdown menu SHALL open below the Split Button aligned to the trailing edge, with a 4dp gap between the button and menu.

### Requirement 19: Split Button Accessibility

**User Story:** As a user relying on assistive technology, I want the Split Button to be properly labeled and navigable, so that I can understand and use both the primary action and the menu.

#### Acceptance Criteria

1. THE leading segment SHALL function as a standard button with `role="button"` and derive its accessible name from its label text or `aria-label` prop.
2. THE trailing segment SHALL have `aria-haspopup="menu"` to indicate it opens a menu.
3. WHEN the menu is open, THE trailing segment SHALL have `aria-expanded="true"`.
4. WHEN the menu is closed, THE trailing segment SHALL have `aria-expanded="false"`.
5. THE SplitButton_Component SHALL support keyboard navigation: Tab moves focus between segments, Enter/Space activates the focused segment, Escape closes the menu if open.
6. WHILE either segment is disabled, THE disabled segment SHALL render at 38% opacity, prevent pointer interaction, and be excluded from the tab order.
7. THE SplitButton_Component SHALL accept a `disabled` prop that disables both segments simultaneously, and individual `leadingDisabled` / `trailingDisabled` props for independent control.

### Requirement 20: Split Button Composition

**User Story:** As a developer, I want the Split Button to support ref forwarding and flexible rendering, so that I can compose it with other patterns and access the DOM imperatively.

#### Acceptance Criteria

1. THE SplitButton_Component SHALL forward refs to the outer container DOM element for imperative access.
2. THE SplitButton_Component SHALL accept a `leadingAsChild` prop that renders the leading segment styles onto the immediate child element using the Radix Slot pattern.
3. WHEN `leadingAsChild` is true, THE leading segment SHALL merge className, event handlers, and ARIA attributes onto the child element.

### Requirement 21: Dark Mode Compatibility

**User Story:** As a user who prefers dark mode, I want all three new components to adapt correctly to the dark color scheme, so that they remain legible and visually consistent in dark environments.

#### Acceptance Criteria

1. WHEN the application is in dark mode (`.dark` class on root), THE ExtendedFAB_Component, FABMenu_Component, and SplitButton_Component SHALL use the dark-mode values of all referenced M3 color tokens as defined in the Theme_System.
2. WHEN the application is in dark mode, THE ExtendedFAB_Component elevation shadows SHALL use light surface-tint values (as defined by the dark-mode elevation tokens).
3. THE ExtendedFAB_Component, FABMenu_Component, and SplitButton_Component SHALL maintain WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI components) in both light and dark modes.

### Requirement 22: Reduced Motion Compliance

**User Story:** As a user with motion sensitivity, I want all animations in these components to be instant when reduced motion is enabled, so that the interface does not trigger discomfort.

#### Acceptance Criteria

1. WHILE the user has `prefers-reduced-motion: reduce` active, THE ExtendedFAB_Component SHALL complete all state transitions (hover, focus, press, elevation changes) instantly with zero duration.
2. WHILE the user has `prefers-reduced-motion: reduce` active, THE FABMenu_Component SHALL open and close without staggered animation (items appear/disappear simultaneously).
3. WHILE the user has `prefers-reduced-motion: reduce` active, THE SplitButton_Component trailing segment icon rotation SHALL complete instantly with zero duration.
4. WHILE the user has `prefers-reduced-motion: reduce` active, THE SplitButton_Component inner corner radius transitions SHALL complete instantly with zero duration.
