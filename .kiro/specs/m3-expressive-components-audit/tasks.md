# Implementation Plan: M3 Expressive Components Audit

## Overview

This plan performs an audit-and-fix pass across all components in the `@vkieu/mui` library against M3 Expressive token specifications. Components are grouped by priority: HIGH priority targets known gaps identified in the design document, MEDIUM priority covers components that need thorough verification, and LOWER priority covers components believed to be compliant but needing confirmation. Each task is self-contained — a sub-agent can read the component, compare against the spec tables in the design document, and fix discrepancies in a single pass.

## Tasks

- [ ] 1. HIGH PRIORITY — Fix known spec violations
  - [x] 1.1 Fix Button default size from h-9 (36dp) to h-10 (40dp)
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/buttons/button.tsx`
    - In the CVA size variants, change the default size from `h-9` to `h-10` (or change the default variant from `s` to `m` if `m` already uses `h-10`)
    - Verify horizontal padding is `px-6` (no icon) and `pl-4 pr-6` (with leading icon) for the default size
    - Verify shape is `rounded-full` and typography uses Label Large (14px/20px/500/0.1px)
    - Verify press shape morph: `active:rounded-xl` with `transition-[border-radius,box-shadow] duration-100 ease-out`
    - Ensure no forced `position` or explicit `width` on root element
    - _Requirements: 1.1, 1.3, 1.10, 1.14_

  - [x] 1.2 Fix Card filled variant background from surface-container-high to surface-container-highest
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/card.tsx`
    - In the CVA variants for the "filled" variant, change `bg-surface-container-high` to `bg-surface-container-highest`
    - Verify elevated variant uses `bg-surface-container-low` with Level 1 shadow
    - Verify outlined variant uses `bg-surface` with `border border-outline-variant`
    - Verify shape is `rounded-xl` (corner-medium 12dp)
    - Verify interactive cards have state layers (8% hover, 10% focus, 10% press)
    - Verify hover on elevated variant increases to Level 2 shadow
    - Verify sub-components (CardHeader, CardContent, CardFooter) use `px-4` (16dp horizontal padding)
    - Ensure no forced `position` or explicit `width` on root element
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 1.3 Fix NavigationRail collapsed width from w-24 (96dp) to w-20 (80dp)
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/navigation/navigation-rail.tsx`
    - Change collapsed width from `w-24` to `w-20`
    - Verify background uses `bg-surface-container`
    - Verify active indicator uses `bg-secondary-container` with `rounded-full` (pill shape)
    - Verify icon size is 24dp (`size-6`) and label uses Label Medium (12px/16px/500/0.5px)
    - Verify no forced `position: fixed` unless an explicit prop opts in
    - _Requirements: 7.3, 7.4, 7.7, 7.8_

  - [x] 1.4 Fix Menu elevation from Level 3 to Level 2 shadow
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/menu.tsx`
    - Change shadow from `--elevation-3` to `--elevation-2` (pattern: `0_3px_6px_var(--elevation-2)`)
    - Verify container: min-width 112dp (`min-w-28`), max-width 280dp (`max-w-70`), shape `rounded-sm` (4dp), background `bg-surface-container`
    - Verify MenuItem: height 48dp (`h-12`), padding 12dp (`px-3`), Body Large typography (16px/24px/400/0.5px)
    - Verify icon size 24dp with `on-surface-variant` color
    - Verify state layer on hover (8% `on-surface` opacity)
    - Verify enter animation (fade+scale 150ms ease-out) and exit (fade 75ms linear)
    - Verify MenuDivider: 1dp height, `outline-variant` color, 8dp vertical margin
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8_

  - [x] 1.5 Fix Context Menu elevation to match Menu (Level 2)
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/context-menu.tsx`
    - Apply same Level 2 shadow fix as Menu component
    - Verify container specs match Menu: `rounded-sm`, `bg-surface-container`, min/max width
    - Verify item specs match Menu: height 48dp, Body Large typography, state layers
    - If context-menu is not yet fully implemented, flag the gap in a code comment
    - _Requirements: 8.1, 8.2, 8.9_

  - [ ]* 1.6 Write unit tests for HIGH priority fixes
    - Test Button renders with `h-10` class at default size
    - Test Card filled variant has `bg-surface-container-highest` class
    - Test NavigationRail renders with `w-20` class when collapsed
    - Test Menu container uses `--elevation-2` shadow (not `--elevation-3`)
    - _Requirements: 1.1, 4.2, 7.3, 8.2_

- [x] 2. Checkpoint — HIGH priority fixes verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. MEDIUM PRIORITY — Button family full audit
  - [x] 3.1 Audit and fix Button variants (filled, outlined, tonal, text, elevated)
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/buttons/button.tsx`
    - Verify filled: `bg-primary`, `text-primary-foreground`, hover adds Level 1 shadow
    - Verify outlined: `border border-outline`, transparent bg, `text-primary`
    - Verify tonal: `bg-secondary-container`, `text-secondary-container-foreground`
    - Verify text: `bg-transparent`, `text-primary`
    - Verify elevated: `bg-surface-container-low`, `text-primary`, Level 1 shadow at rest
    - Verify all variants have state layers (8% hover, 10% focus, 10% press)
    - Fix any discrepancies
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 3.2 Audit and fix FAB component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/buttons/fab.tsx`
    - Verify sizes: small 48dp (`size-12`), medium 56dp (`size-14`), large 96dp (`size-24`)
    - Verify shape: corner-large (`rounded-2xl`) at rest, `active:rounded-xl` on press
    - Verify elevation: Level 3 at rest, Level 4 on hover
    - Verify tonal surface color for the "surface" color variant
    - Verify no forced `position: fixed` unless `fixed` prop is true
    - Fix any discrepancies
    - _Requirements: 1.11, 1.12, 1.14_

  - [x] 3.3 Audit and fix Extended FAB component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/buttons/extended-fab.tsx`
    - Verify height 56dp (`h-14`), auto width, corner-large shape
    - Verify same elevation as FAB (Level 3 rest, Level 4 hover)
    - Verify icon size 24dp, Label Large typography, gap between icon and label
    - Fix any discrepancies
    - _Requirements: 1.11, 1.12_

  - [x] 3.4 Audit and fix Split Button and Button Group
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/buttons/split-button.tsx`
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/buttons/button-group.tsx`
    - Verify consistent height (40dp), shape, and state layer tokens matching standard Button
    - Verify divider between split sections uses `outline-variant`
    - Fix any discrepancies
    - _Requirements: 1.13_

  - [x] 3.5 Audit and fix Icon Button component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/buttons/icon-button.tsx`
    - Verify container is 40dp (`size-10`), icon is 24dp, shape `rounded-full`
    - Verify state layer 40dp circular, touch target 48dp
    - Verify variants (standard, filled, tonal, outlined) use correct color tokens
    - Fix any discrepancies
    - _Requirements: 1.9, 1.14_

  - [ ]* 3.6 Write unit tests for Button family audit
    - Test each Button variant renders correct bg/text/border classes
    - Test FAB renders correct size classes for each size prop
    - Test Icon Button renders with `size-10` and correct state layers
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.11_

- [x] 4. MEDIUM PRIORITY — Selection Controls audit
  - [x] 4.1 Audit and fix Checkbox component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/checkbox.tsx`
    - Verify visual container 18dp × 18dp with 2dp corner radius (`rounded-[2px]`)
    - Verify state layer 40dp circular, touch target 48dp minimum
    - Verify unchecked: border `on-surface-variant`, transparent fill
    - Verify checked: background `primary`, checkmark `on-primary`
    - Verify disabled+checked: background `on-surface` at 38% opacity
    - Fix any discrepancies
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.2 Audit and fix Radio component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/radio.tsx`
    - Verify outer circle 20dp with 2dp border, inner dot 10dp
    - Verify state layer 40dp circular, touch target 48dp
    - Verify selected: border and dot use `primary`
    - Verify unselected: border uses `on-surface-variant`
    - Fix any discrepancies
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 4.3 Audit and fix Switch component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/switch.tsx`
    - Verify track 52dp × 32dp with pill shape (`rounded-full`)
    - Verify handle sizes: unselected 16dp, selected 24dp, pressed 28dp
    - Verify unselected: track `surface-container-highest` with `outline` border, handle `outline` color
    - Verify selected: track `primary` (no border), handle `on-primary`
    - Verify spring animation: 200ms with `cubic-bezier(0.2, 0, 0, 1)`
    - Verify no forced width beyond 48dp touch target
    - Fix any discrepancies
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12_

  - [ ]* 4.4 Write unit tests for Selection Controls
    - Test Checkbox renders correct size, border, and color classes per state
    - Test Radio renders correct circle/dot sizes and colors per state
    - Test Switch renders correct track/handle sizes and animation classes
    - _Requirements: 2.1, 2.5, 2.8_

- [x] 5. MEDIUM PRIORITY — Select/Dropdown audit
  - [x] 5.1 Audit and fix Select component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/select.tsx`
    - Verify trigger height 56dp (`h-14`), outlined border `border-outline` with 4dp radius (`rounded-sm`)
    - Verify dropdown bg `surface-container`, shape `rounded-sm`, Level 2 elevation shadow
    - Verify menu item height 48dp (`h-12`), Body Large typography (16px/24px/400/0.5px)
    - Verify min-width 112dp (`min-w-28`), max-width 280dp (`max-w-70`), vertical padding 8dp (`py-2`)
    - Verify state layer on focused/hovered options (8% `on-surface`)
    - Verify no forced width on root wrapper
    - Fix any discrepancies
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.2 Write unit tests for Select component
    - Test trigger renders with `h-14` and correct border classes
    - Test dropdown container uses Level 2 shadow and `bg-surface-container`
    - Test menu item renders with correct height and typography
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. MEDIUM PRIORITY — Tabs audit
  - [x] 6.1 Audit and fix Tabs component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/tabs.tsx`
    - Verify TabList height: 48dp without icons, 64dp with icons
    - Verify primary indicator: 3dp tall, rounded top corners, spans label width only
    - Verify secondary indicator: 2dp tall, full tab width
    - Verify label typography: Title Small (14px/20px/500/0.1px)
    - Verify icon size 24dp, positioned above label in primary variant
    - Verify bottom divider `border-b border-outline-variant`
    - Verify indicator animation: `transition-[left,width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]`
    - Verify state layers (8% hover, 10% focus)
    - Fix any discrepancies
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 6.2 Write unit tests for Tabs component
    - Test primary indicator is 3dp tall and spans label width
    - Test secondary indicator is 2dp tall and spans full tab width
    - Test correct typography classes applied
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 7. MEDIUM PRIORITY — Navigation Bar and App Bar audit
  - [x] 7.1 Audit and fix AppBar component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/app-bar.tsx`
    - Verify height 64dp (`h-16`)
    - Verify background: `surface` at rest, `surface-container` when elevated
    - Verify headline typography: Title Large (22px/28px/400)
    - Verify icon touch targets 48dp with 24dp icons
    - Verify no forced `position: fixed` unless an explicit prop opts in
    - Fix any discrepancies
    - _Requirements: 7.1, 7.2, 7.8_

  - [x] 7.2 Audit and fix NavigationBar component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/navigation/navigation-bar.tsx`
    - Verify height 80dp (`h-20`), background `surface-container`
    - Verify items are horizontally distributed
    - Verify active indicator: `bg-secondary-container` with corner-full shape (16dp × 32dp pill)
    - Verify icon size 24dp, label Label Medium (12px/16px/500/0.5px)
    - Verify no forced `position: fixed` unless an explicit prop opts in
    - Fix any discrepancies
    - _Requirements: 7.5, 7.6, 7.7, 7.8_

  - [ ]* 7.3 Write unit tests for Navigation components
    - Test AppBar renders with `h-16` and correct background classes
    - Test NavigationBar renders with `h-20` and correct active indicator
    - Test NavigationRail uses `w-20` (already fixed in 1.3, this validates)
    - _Requirements: 7.1, 7.3, 7.5_

- [x] 8. MEDIUM PRIORITY — Snackbar audit
  - [x] 8.1 Audit and fix Snackbar component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/snackbar.tsx`
    - Verify shape: `rounded-sm` (4dp radius)
    - Verify background `inverse-surface`, text `inverse-on-surface`
    - Verify elevation Level 3 shadow
    - Verify supporting text: Body Medium (14px/20px/400/0.25px)
    - Verify action button: Label Large (14px/20px/500/0.1px), color `inverse-primary`
    - Verify min height 48dp (`min-h-12`), left padding 16dp (`pl-4`)
    - Verify max-width 560dp (`max-w-140`) on desktop
    - Verify enter animation: slide from bottom 200ms, exit fade 150ms
    - Verify auto-dismiss 6000ms (no action) and persistent (with action)
    - Fix any discrepancies
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 8.2 Write unit tests for Snackbar component
    - Test renders with `rounded-sm`, correct bg/text classes
    - Test action button renders with correct typography and color
    - Test max-width constraint is present
    - _Requirements: 9.1, 9.3, 9.4_

- [-] 9. Checkpoint — MEDIUM priority fixes verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. LOWER PRIORITY — Chip audit (believed compliant)
  - [ ] 10.1 Verify Chip component against M3 spec
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/chip.tsx`
    - Verify height 32dp (`h-8`), shape `rounded-lg` (8dp)
    - Verify Label Large typography (14px/20px/500/0.1px)
    - Verify padding: 16dp without icons, 8dp on icon side
    - Verify icon size 18dp, gap 8dp
    - Verify selected (filter): `bg-secondary-container`, `text-secondary-container-foreground`
    - Verify elevated: `bg-surface-container-low`, Level 1 shadow
    - Verify disabled: 38% opacity
    - Verify state layers using `before:` pseudo (8% hover, 10% focus, 10% press)
    - Fix any discrepancies found
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9, 3.10, 3.11_

  - [ ]* 10.2 Write unit tests for Chip component
    - Test renders with correct height, shape, and typography classes
    - Test selected filter variant has correct background/text classes
    - Test disabled state applies opacity
    - _Requirements: 3.1, 3.6, 3.11_

- [ ] 11. LOWER PRIORITY — Remaining components audit
  - [ ] 11.1 Audit and fix Slider component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/slider.tsx`
    - Verify active track `bg-primary`, inactive track `bg-secondary-container`
    - Verify handle: 44dp height × 4dp width, `primary` color
    - Verify track height 16dp (`h-4`) with 8dp radius (`rounded-lg`)
    - Verify discrete stop indicators: 4dp circles, `on-primary` (active), `on-secondary-container` (inactive)
    - Fix any discrepancies
    - _Requirements: 10.1, 10.2_

  - [ ] 11.2 Audit and fix Badge component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/badge.tsx`
    - Verify dot variant: 6dp × 6dp (`size-1.5`), `bg-error`
    - Verify count variant: 16dp height, min-width 16dp, Label Small (11px/16px/500)
    - Fix any discrepancies
    - _Requirements: 10.3_

  - [ ] 11.3 Audit and fix Tooltip component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/tooltip.tsx`
    - Verify plain variant: `inverse-surface` bg, 24dp height (`h-6`), 4dp radius (`rounded-sm`), Body Small typography (12px/16px/400/0.4px), 500ms show delay
    - Verify rich variant: `surface-container` bg, 12dp radius (`rounded-xl`), max-width 320dp, Level 2 shadow
    - Fix any discrepancies
    - _Requirements: 10.4, 10.5_

  - [ ] 11.4 Audit and fix List component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/list.tsx`
    - Verify item heights: 1-line 56dp (`h-14`), 2-line 72dp (`h-18`), 3-line 88dp (`h-22`)
    - Verify 16dp horizontal padding, Body Large typography for primary text
    - Fix any discrepancies
    - _Requirements: 10.6_

  - [ ] 11.5 Audit and fix Divider component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/divider.tsx`
    - Verify 1dp height (`h-px`), full-width, `outline-variant` color
    - Verify inset variant uses 16dp left margin
    - Fix any discrepancies
    - _Requirements: 10.7_

  - [ ] 11.6 Audit and fix Progress Indicators
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/indicators/` directory
    - Verify CircularProgress: 48dp default (`size-12`), 4dp stroke width, `primary` color
    - Verify LinearProgress: 4dp height (`h-1`), `primary` active track, `surface-container-highest` inactive track
    - Verify indeterminate variants use continuous animation with M3 easing
    - Fix any discrepancies
    - _Requirements: 10.8, 10.9_

  - [ ] 11.7 Audit and fix Search component
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/search.tsx`
    - Verify height 56dp (`h-14`), corner-full shape (`rounded-full`), search icon 24dp in leading position
    - Verify matches TextField outlined specs where applicable
    - Fix any discrepancies
    - _Requirements: 10.11_

  - [ ] 11.8 Verify consumer-friendliness across all remaining components
    - Spot-check that no remaining component root forces `position: fixed/absolute` or explicit `width`
    - Check that `className` prop is accepted on all component roots
    - Check that components using internal z-index apply `isolate` class
    - Flag any violations and fix
    - _Requirements: 10.12_

  - [ ]* 11.9 Write unit tests for remaining components
    - Test Slider renders correct track/handle classes
    - Test Badge dot and count variants render correct sizes
    - Test Tooltip plain and rich variants render correct bg/shape
    - Test List items render correct height classes
    - Test Divider renders with `h-px` and `outline-variant`
    - Test Progress indicators render with correct sizes
    - _Requirements: 10.1, 10.3, 10.4, 10.6, 10.7, 10.8_

- [ ] 12. LOWER PRIORITY — Verify theme.css token completeness
  - [ ] 12.1 Audit theme.css for missing M3 tokens
    - Read `/Users/xuan-manh.trinh/workplace/web/mui/src/theme.css`
    - Verify all color tokens exist: `--primary`, `--on-primary`, `--secondary-container`, `--on-secondary-container`, `--surface-container-*` (low, default, high, highest), `--outline`, `--outline-variant`, `--inverse-surface`, `--inverse-on-surface`, `--inverse-primary`, `--error`
    - Verify elevation tokens: `--elevation-1` through `--elevation-5`
    - Verify shape tokens: `--shape-full`, `--shape-xl`, `--shape-lg`, `--shape-md`, `--shape-sm`
    - Verify state layer tokens: `--state-hover` (0.08), `--state-focus` (0.10), `--state-press` (0.10)
    - Verify `@media (prefers-reduced-motion: reduce)` block disables all animations
    - Add any missing tokens
    - _Requirements: 1.9, 2.11, 3.10, 4.5, 5.5, 6.8, 8.5_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between priority tiers
- This is an audit-and-fix pass — not a rewrite. Each task reads the component, compares against the M3 Expressive spec tables in the design document, and fixes only the discrepancies
- The `@vkieu/mui` library lives at `/Users/xuan-manh.trinh/workplace/web/mui/src/`
- All fixes use Tailwind CSS v4 canonical utility classes
- Component APIs (props, TypeScript interfaces) remain unchanged — only CSS classes and animation parameters are modified
- The design document's "Token Mapping Tables" section is the source of truth for each component's expected classes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["1.6"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "4.1", "4.2", "4.3", "5.1", "6.1", "7.1", "7.2", "8.1"] },
    { "id": 3, "tasks": ["3.6", "4.4", "5.2", "6.2", "7.3", "8.2"] },
    { "id": 4, "tasks": ["10.1", "11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "12.1"] },
    { "id": 5, "tasks": ["10.2", "11.9"] }
  ]
}
```
