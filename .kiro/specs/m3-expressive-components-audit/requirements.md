# Requirements Document

## Introduction

This specification defines the comprehensive audit of all components in the `@vkieu/mui` library (located at `/Users/xuan-manh.trinh/workplace/web/mui/src/`) against Material Design 3 (M3) Expressive guidelines. The audit verifies dimensional tokens, color tokens, typography, elevation, shape, state layers, motion, and consumer-friendliness (no forced position/width on root wrappers). All styling uses Tailwind CSS v4 canonical utility classes.

## Glossary

- **M3_Expressive**: The Material Design 3 Expressive theme system emphasizing tonal elevation (no drop shadows for filled surfaces), spring physics motion, and semantic shape tokens
- **Tonal_Elevation**: Surface color changes per elevation level (surface-container-low → surface-container → surface-container-high → surface-container-highest) without CSS box-shadow for filled/tonal variants
- **Spring_Motion**: CSS spring-based animation physics using short-duration easing curves (`duration-100 ease-out` or equivalent spring physics) for interactive shape morphs on press
- **Semantic_Shape_Token**: Named corner-radius values from M3 (corner-none=0, corner-extra-small=4px, corner-small=8px, corner-medium=12px, corner-large=16px, corner-extra-large=28px, corner-full=9999px)
- **State_Layer**: A pseudo-element overlay providing M3-specified opacity feedback (8% hover, 10% focus, 10% press) using `before:` or similar technique
- **Consumer_Friendly**: Root wrapper elements do not force CSS `position`, `width`, or layout constraints that prevent composability in consuming applications
- **Tailwind_V4**: Tailwind CSS version 4 canonical utility classes (e.g., `h-10`, `rounded-full`, `px-6`) without arbitrary value hacks where a standard utility exists
- **Audit_System**: The automated and manual review process that checks each component against M3 token specifications
- **Label_Large**: M3 typography role: 14px font-size, 20px line-height, 500 weight, 0.1px letter-spacing
- **Title_Small**: M3 typography role: 14px font-size, 20px line-height, 500 weight, 0.1px letter-spacing
- **Body_Large**: M3 typography role: 16px font-size, 24px line-height, 400 weight, 0.5px letter-spacing
- **Body_Small**: M3 typography role: 12px font-size, 16px line-height, 400 weight, 0.4px letter-spacing

## Requirements

### Requirement 1: Button Components Audit

**User Story:** As a design systems engineer, I want all button components (button, fab, extended-fab, split-button, button-group) to comply with M3 Expressive token specifications, so that the library delivers pixel-accurate, spec-compliant interactive buttons.

#### Acceptance Criteria

1. WHEN the Button component renders at default size, THE Audit_System SHALL verify the container height is 40dp (Tailwind `h-10`), horizontal padding is 24dp (Tailwind `px-6`) without a leading icon and 16dp left / 24dp right with a leading icon, and shape is corner-full (Tailwind `rounded-full`)
2. WHEN a leading icon is present in the Button, THE Audit_System SHALL verify the icon size is 18dp and the gap between icon and label is 8dp
3. THE Audit_System SHALL verify that Button typography uses Label_Large tokens: font-size 14px, line-height 20px, font-weight 500, letter-spacing 0.1px
4. WHEN the Button variant is "filled", THE Audit_System SHALL verify background uses `bg-primary`, text uses `text-primary-foreground`, and hover elevation uses tonal shadow Level 1
5. WHEN the Button variant is "outlined", THE Audit_System SHALL verify a 1px border using `border-outline`, transparent background, and `text-primary`
6. WHEN the Button variant is "tonal", THE Audit_System SHALL verify background uses `bg-secondary-container`, text uses `text-secondary-container-foreground`
7. WHEN the Button variant is "text", THE Audit_System SHALL verify transparent background and `text-primary`
8. WHEN the Button variant is "elevated", THE Audit_System SHALL verify background uses `bg-surface-container-low`, text uses `text-primary`, and resting elevation is Level 1
9. THE Audit_System SHALL verify that all Button variants implement state layers at 8% opacity on hover, 10% on focus, and 10% on press
10. WHEN the Button is pressed, THE Audit_System SHALL verify spring motion shape morph (border-radius reduction) uses `transition-[border-radius] duration-100 ease-out`
11. THE Audit_System SHALL verify the FAB component uses sizes small (48dp), medium (56dp), large (96dp), extended (56dp height auto-width), with corner-large shape (16dp radius) at rest and morphed radius on press
12. THE Audit_System SHALL verify FAB elevation is Level 3 at rest and Level 4 on hover, using tonal surface color for the "surface" color variant
13. THE Audit_System SHALL verify the split-button and button-group components use consistent height, shape, and state layer tokens matching the standard Button
14. THE Audit_System SHALL verify that no Button component root element forces CSS `position: fixed`, `position: absolute`, or explicit `width` values (except FAB when `fixed` prop is true)

### Requirement 2: Selection Controls Audit

**User Story:** As a design systems engineer, I want checkbox, radio, and switch components to match M3 Expressive specifications for sizing, colors, and animation, so that form inputs are accessible and visually consistent.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Checkbox visual container is 18dp × 18dp with 2dp corner radius, the state layer is 40dp circular, and the touch target is 48dp minimum
2. WHEN the Checkbox is unchecked, THE Audit_System SHALL verify the border color is `on-surface-variant` with transparent fill
3. WHEN the Checkbox is checked, THE Audit_System SHALL verify the background is `primary` and the checkmark icon color is `on-primary`
4. WHEN the Checkbox is disabled and checked, THE Audit_System SHALL verify the background uses `on-surface` at 38% opacity
5. THE Audit_System SHALL verify the Radio button outer circle is 20dp with a 2dp border, the inner dot is 10dp, and the state layer is 40dp circular with 48dp touch target
6. WHEN the Radio is selected, THE Audit_System SHALL verify border and inner dot use `primary` color
7. WHEN the Radio is unselected, THE Audit_System SHALL verify border uses `on-surface-variant` color
8. THE Audit_System SHALL verify the Switch track is 52dp × 32dp with pill shape (corner-full), and the handle sizes are: unselected 16dp, selected/with-icon 24dp, pressed 28dp
9. WHEN the Switch is unselected, THE Audit_System SHALL verify the track uses `surface-container-highest` background with `outline` border, and the handle uses `outline` color
10. WHEN the Switch is selected, THE Audit_System SHALL verify the track uses `primary` background (no border) and the handle uses `on-primary` color
11. THE Audit_System SHALL verify all selection controls use spring animation: handle/check transitions with duration 100-200ms and `cubic-bezier(0.2, 0, 0, 1)` easing
12. THE Audit_System SHALL verify no selection control root wrapper forces explicit width or position styles beyond the 48dp touch target

### Requirement 3: Chip Audit

**User Story:** As a design systems engineer, I want all chip variants (assist, filter, input, suggestion) to comply with M3 Expressive token specifications, so that chips are correctly sized, shaped, and interactive.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Chip container height is 32dp (Tailwind `h-8`) and shape uses corner-small (8dp radius, Tailwind `rounded-lg`)
2. THE Audit_System SHALL verify Chip typography uses Label_Large: font-size 14px, line-height 20px, font-weight 500, letter-spacing 0.1px
3. THE Audit_System SHALL verify Chip horizontal padding is 16dp without icons and 8dp on the icon side when a leading or trailing icon is present
4. THE Audit_System SHALL verify Chip icon size is 18dp and gap between icon and label is 8dp
5. WHEN the Chip variant is "assist", THE Audit_System SHALL verify a 1dp border using `outline` color and `surface-foreground` text
6. WHEN the Chip variant is "filter" and selected is true, THE Audit_System SHALL verify background uses `secondary-container`, text uses `on-secondary-container`, and border is removed
7. WHEN the Chip variant is "filter" and selected is true, THE Audit_System SHALL verify a checkmark icon (18dp) replaces the leading icon
8. WHEN the Chip variant is "input" and onDismiss is provided, THE Audit_System SHALL verify a close icon (18dp) is rendered with a 48dp touch target
9. WHEN the Chip elevated prop is true, THE Audit_System SHALL verify background uses `surface-container-low` and elevation is Level 1 (tonal shadow)
10. THE Audit_System SHALL verify Chip state layers at 8% hover, 10% focus, 10% press using a `before:` pseudo-element
11. THE Audit_System SHALL verify disabled chips use 38% opacity and disable pointer events

### Requirement 4: Card Audit

**User Story:** As a design systems engineer, I want card variants (filled, elevated, outlined) to match M3 Expressive token specifications, so that surface containers are correctly elevated and shaped.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Card shape uses corner-medium (12dp radius, Tailwind `rounded-xl`)
2. WHEN the Card variant is "filled", THE Audit_System SHALL verify background uses `surface-container-highest` (or `surface-container-high`), no border, and elevation Level 0 (no shadow)
3. WHEN the Card variant is "elevated", THE Audit_System SHALL verify background uses `surface-container-low` and elevation is Level 1 (tonal shadow)
4. WHEN the Card variant is "outlined", THE Audit_System SHALL verify background uses `surface`, a 1dp border uses `outline-variant`, and elevation is Level 0
5. WHEN the Card interactive prop is true, THE Audit_System SHALL verify state layers at 8% hover, 10% focus, 10% press, with `cursor-pointer` and focus ring
6. WHEN the Card interactive prop is true and hovered, THE Audit_System SHALL verify the elevated variant increases to Level 2 shadow
7. THE Audit_System SHALL verify Card sub-components (CardHeader, CardContent, CardFooter) use 16dp horizontal padding
8. THE Audit_System SHALL verify no Card root element forces explicit width or position styles

### Requirement 5: Select/Dropdown Audit

**User Story:** As a design systems engineer, I want the Select component to match M3 TextField specifications for the trigger and M3 Menu specifications for the dropdown, so that select inputs are consistent with the design system.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Select trigger field matches TextField specs: height 56dp, outlined variant uses 1dp `outline` border with corner-extra-small (4dp) radius, filled variant uses `surface-container-highest` background
2. WHEN the Select dropdown is open, THE Audit_System SHALL verify the menu container uses `surface-container` background, corner-extra-small shape (4dp radius), and Level 2 tonal elevation
3. THE Audit_System SHALL verify dropdown menu item height is 48dp with Body_Large typography (16px/24px/400/0.5px)
4. THE Audit_System SHALL verify the dropdown menu has min-width 112dp, max-width 280dp, and vertical padding of 8dp
5. WHEN a Select option is focused or hovered, THE Audit_System SHALL verify the state layer uses `on-surface` at 8% opacity
6. THE Audit_System SHALL verify the Select component does not force explicit width on the root wrapper

### Requirement 6: Tabs Audit

**User Story:** As a design systems engineer, I want primary and secondary tab variants to comply with M3 Expressive specifications for indicator, height, and typography, so that navigation tabs are pixel-accurate.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Tab container (TabList) height is 48dp without icons and 64dp with icons
2. WHEN the variant is "primary", THE Audit_System SHALL verify the active indicator is 3dp tall, positioned at the bottom, with rounded top corners, and spans only the label width
3. WHEN the variant is "secondary", THE Audit_System SHALL verify the active indicator is 2dp tall, positioned at the bottom, and spans the full tab width
4. THE Audit_System SHALL verify Tab label typography uses Title_Small: font-size 14px, line-height 20px, font-weight 500, letter-spacing 0.1px
5. WHEN a Tab contains an icon, THE Audit_System SHALL verify icon size is 24dp and positioned above the label in primary variant
6. THE Audit_System SHALL verify a bottom border divider (`border-outline-variant`) separates the TabList from content
7. THE Audit_System SHALL verify the active indicator animates position with `transition-[left,width] duration-200` and M3 standard easing
8. THE Audit_System SHALL verify Tab state layers at 8% hover, 10% focus using appropriate on-surface/primary colors

### Requirement 7: Navigation Audit

**User Story:** As a design systems engineer, I want app-bar, navigation-rail, and navigation-bar components to comply with M3 Expressive specifications, so that navigation chrome is dimensionally correct and properly elevated.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the AppBar (top app bar, small variant) container height is 64dp (`h-16`), with `surface` background at rest and `surface-container` background when elevated
2. THE Audit_System SHALL verify AppBar headline uses Title_Large typography (22px/28px/400) and trailing/leading icon touch targets are 48dp with 24dp icons
3. THE Audit_System SHALL verify the NavigationRail collapsed width is 80dp (Tailwind `w-20`) and uses `surface-container` background
4. WHEN a NavigationRail item is active, THE Audit_System SHALL verify the active indicator uses `secondary-container` background with pill shape (corner-full)
5. THE Audit_System SHALL verify the NavigationBar height is 80dp, uses `surface-container` background, and items are horizontally distributed
6. WHEN a NavigationBar item is active, THE Audit_System SHALL verify the active indicator uses `secondary-container` background with corner-full shape (16dp × 32dp pill)
7. THE Audit_System SHALL verify NavigationRail and NavigationBar icon sizes are 24dp and label typography uses Label_Medium (12px/16px/500/0.5px)
8. THE Audit_System SHALL verify navigation components do not force explicit `position: fixed` unless an explicit prop opts in

### Requirement 8: Menu/Context Menu Audit

**User Story:** As a design systems engineer, I want menu and context-menu components to comply with M3 specifications for sizing, elevation, and typography, so that popup menus are consistent across the design system.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Menu container has min-width 112dp, max-width 280dp, corner-extra-small shape (4dp radius, Tailwind `rounded-sm`), and `surface-container` background
2. THE Audit_System SHALL verify Menu elevation uses Level 2 tonal shadow
3. THE Audit_System SHALL verify MenuItem height is 48dp (`h-12`), horizontal padding is 12dp (`px-3`), and label uses Body_Large typography (16px/24px/400/0.5px)
4. THE Audit_System SHALL verify MenuItem leading and trailing icon sizes are 24dp with `on-surface-variant` color
5. WHEN a MenuItem is hovered or focused, THE Audit_System SHALL verify the state layer uses `on-surface` at 8% opacity
6. WHEN a MenuItem is selected, THE Audit_System SHALL verify background uses `surface-container-highest`
7. THE Audit_System SHALL verify MenuDivider height is 1dp with `outline-variant` color and 8dp vertical margin
8. THE Audit_System SHALL verify Menu enter animation uses fade + scale (150ms, ease-out) and exit uses fade (75ms, linear)
9. IF the context-menu component is not yet implemented, THEN THE Audit_System SHALL flag the gap and verify the planned API matches the Menu component pattern

### Requirement 9: Snackbar Audit

**User Story:** As a design systems engineer, I want the Snackbar component to comply with M3 specifications for shape, color, elevation, and behavior, so that transient notifications are correctly presented.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Snackbar container uses corner-extra-small shape (4dp radius, Tailwind `rounded-sm`), `inverse-surface` background, and `inverse-on-surface` text
2. THE Audit_System SHALL verify Snackbar elevation is Level 3 tonal shadow
3. THE Audit_System SHALL verify Snackbar supporting text uses Body_Medium typography (14px/20px/400/0.25px)
4. THE Audit_System SHALL verify Snackbar action button uses Label_Large typography (14px/20px/500/0.1px) with `inverse-primary` color
5. THE Audit_System SHALL verify Snackbar minimum height is 48dp with 16dp left padding and appropriate right padding based on action/close presence
6. WHEN the Snackbar has an action button, THE Audit_System SHALL verify default duration is indefinite (persistent) until user interaction
7. WHEN the Snackbar has no action, THE Audit_System SHALL verify auto-dismiss at 6000ms with pause-on-hover behavior
8. THE Audit_System SHALL verify Snackbar enter animation slides from bottom with 200ms M3 standard easing and exit fades with 150ms
9. THE Audit_System SHALL verify the Snackbar container does not exceed max-width of 560dp on desktop

### Requirement 10: Remaining Components Audit

**User Story:** As a design systems engineer, I want slider, badge, carousel, tooltip, search, list, divider, and progress indicator components to comply with their respective M3 token specifications, so that the library achieves full M3 Expressive coverage.

#### Acceptance Criteria

1. THE Audit_System SHALL verify the Slider active track uses `primary`, inactive track uses `secondary-container`, handle is 44dp height × 4dp width with `primary` color, and track height is 16dp with 8dp radius
2. WHEN the Slider is discrete (step prop provided), THE Audit_System SHALL verify stop indicators are 4dp circles using `on-primary` (active) and `on-secondary-container` (inactive) colors
3. THE Audit_System SHALL verify the Badge dot variant is 6dp × 6dp with `error` background, and count variant is 16dp height min-width 16dp with Label_Small typography (11px/16px/500)
4. THE Audit_System SHALL verify the Tooltip plain variant uses `inverse-surface` background, 24dp height, 4dp corner radius, Body_Small typography (12px/16px/400/0.4px), and 500ms show delay
5. THE Audit_System SHALL verify the Tooltip rich variant uses `surface-container` background, 12dp corner radius, max-width 320dp, and Level 2 elevation shadow
6. THE Audit_System SHALL verify the List component item height is 56dp (one-line), 72dp (two-line), or 88dp (three-line) with 16dp horizontal padding and Body_Large typography for primary text
7. THE Audit_System SHALL verify the Divider uses 1dp height, full-width with `outline-variant` color, and inset variant uses 16dp left margin
8. THE Audit_System SHALL verify CircularProgress uses 48dp default size with 4dp stroke width and `primary` color, and LinearProgress uses 4dp height with `primary` active track and `surface-container-highest` inactive track
9. WHEN a progress indicator is indeterminate, THE Audit_System SHALL verify continuous animation using M3 standard easing curves
10. IF the carousel component is not yet implemented, THEN THE Audit_System SHALL flag the gap with recommended M3 specs (item width ratios, peek amount, snap behavior)
11. THE Audit_System SHALL verify the Search component matches TextField outlined specs with 56dp height, corner-full shape (28dp radius), and search icon (24dp) in the leading position
12. THE Audit_System SHALL verify no remaining component root wrapper forces explicit position or width styles that break consumer composability
