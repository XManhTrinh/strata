# Implementation Plan: Typography & Deep Audit

## Overview

This plan implements three coordinated efforts: (1) a new Typography component with all 15 M3 type scale roles, (2) a sidebar animation fix for the docs site, and (3) a deep audit of all 36+ components against M3 Expressive specifications across 20 dimensions. Tasks are grouped by Typography first (foundation for type scale corrections), sidebar fix (isolated quick win), then audit by component group (buttons → simple → controls → navigation/lists → containers → overlays → inputs → nav → complex).

## Tasks

- [x] 1. Create the Typography component
  - [x] 1.1 Create `mui/src/typography.tsx` with CVA variants for all 15 M3 type scale roles
    - Define `TypographyVariant` and `TypographyColor` types
    - Create `typographyVariants` CVA config with all 15 variant classes (font-size, line-height, font-weight, letter-spacing)
    - Create `ELEMENT_MAP` mapping each variant to its default HTML element
    - Implement the `Typography` component with `forwardRef`, `cn()` merging, `Slot` support via `asChild`
    - Support `variant`, `color`, `as`, `asChild`, `className`, and all HTML attributes
    - Default variant: `body-medium`, default color: `surface-foreground`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3_

  - [x] 1.2 Export Typography from `mui/src/index.ts`
    - Add `Typography`, `typographyVariants` exports
    - Add `TypographyProps` type export
    - _Requirements: 1.1_

  - [ ]* 1.3 Write property tests for Typography component
    - **Property 1: Typography variant produces correct type scale classes**
    - **Property 2: Typography variant renders correct default HTML element**
    - **Property 3: Typography color prop maps to correct text color class**
    - **Property 4: Typography forwards arbitrary HTML attributes**
    - **Property 5: Typography className merges without overriding base styles**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 2.3**

- [x] 2. Fix the collapsible sidebar animation
  - [x] 2.1 Fix the expand/collapse transition in `mui/docs/src/app/layout.tsx`
    - Change `duration-200` to `duration-250` for adequate expand time
    - Ensure the grid container uses `[grid-template-rows:1fr]` / `[grid-template-rows:0fr]` Tailwind syntax
    - Confirm inner container has `overflow-hidden min-h-0` for proper grid animation
    - Verify both expand and collapse animate smoothly with M3 standard easing
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 3. Checkpoint — Verify Typography and sidebar fix
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Deep audit — Buttons group
  - [x] 4.1 Audit and fix `mui/src/buttons/button.tsx`
    - Verify size variants produce correct heights: xs=h-8, s=h-9, m=h-10, l=h-12, xl=h-14
    - Ensure `label-large` type scale (14px/500) for button labels
    - Replace any `transition-all` with specific transition properties
    - Ensure state layers: 8% hover, 10% focus-visible, 10% active
    - Add `cursor-pointer` if missing, `disabled:cursor-not-allowed`
    - Replace `disabled:opacity-50` with `disabled:opacity-[0.38]` and add `disabled:pointer-events-none`
    - Ensure `focus-visible:ring-2` focus ring
    - Replace bracket notation with canonical Tailwind classes where equivalents exist (e.g., `rounded-full`, `h-10`)
    - Verify icon sizes: 20dp for medium buttons
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 5.1, 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, 12.1, 13.1, 13.2, 14.1, 15.1, 16.1, 16.4, 16.5, 17.1, 18.1, 18.2, 19.1, 20.1, 20.2, 20.3, 21.1_

  - [x] 4.2 Audit and fix `mui/src/buttons/icon-button.tsx`
    - Ensure 48dp touch target with 40dp visible area
    - Verify state layers, cursor, disabled treatment, focus ring
    - Replace non-canonical Tailwind classes
    - Verify icon size: 24dp
    - _Requirements: 3.3, 4.1, 5.1, 7.1, 7.2, 7.3, 8.1, 8.2, 13.2, 14.1, 14.2, 15.1, 16.1, 18.1, 19.1_

  - [x] 4.3 Audit and fix `mui/src/buttons/fab.tsx`
    - Verify shape: lg (16px) border radius
    - Verify elevation: level 3 default, level 4 on hover
    - Ensure state layers and cursor behavior
    - Replace non-canonical classes
    - _Requirements: 4.1, 5.1, 6.1, 6.2, 7.1, 7.2, 7.3, 8.1, 13.2, 15.1, 18.1, 19.1_

  - [x] 4.4 Audit and fix `mui/src/buttons/extended-fab.tsx`
    - Same dimensions as FAB plus label compliance with `label-large`
    - Verify icon-to-label gap: 8px
    - _Requirements: 3.2, 4.1, 5.1, 6.1, 7.1, 8.1, 12.1, 13.2, 15.1, 18.1, 19.1_

  - [x] 4.5 Audit and fix `mui/src/buttons/fab-menu.tsx`, `split-button.tsx`, `button-group.tsx`
    - Verify spacing, shape, state layers, cursor, disabled, focus ring, transitions
    - Ensure composability: uses internal Button/IconButton components
    - _Requirements: 3.1, 4.1, 7.1, 8.1, 13.2, 15.1, 18.1, 23.2, 23.5_

  - [ ]* 4.6 Write property test for Button size variants
    - **Property 10: Button size variants produce correct heights**
    - **Validates: Requirements 20.2**

- [x] 5. Deep audit — Icon, Badge, Divider
  - [x] 5.1 Audit and fix `mui/src/icon.tsx`
    - Verify size variants match M3 icon scale (18/20/24dp)
    - Ensure no cursor-pointer on non-interactive icon usage
    - Replace non-canonical classes
    - _Requirements: 13.2, 19.1, 19.2_

  - [x] 5.2 Audit and fix `mui/src/badge.tsx`
    - Verify shape, color roles, sizing per M3
    - Ensure correct type scale for badge label
    - _Requirements: 4.1, 5.1, 12.1, 13.2_

  - [x] 5.3 Audit and fix `mui/src/divider.tsx`
    - Verify correct color token (`outline-variant`)
    - _Requirements: 5.1, 5.2, 13.2_

- [x] 6. Deep audit — Chip, Switch, Checkbox, Radio, Slider
  - [x] 6.1 Audit and fix `mui/src/chip.tsx`
    - Verify shape: sm (8px) border radius
    - Ensure `label-large` for chip label text
    - Verify state layers, cursor, disabled, focus ring, truncation
    - Verify icon size: 18dp
    - _Requirements: 3.1, 4.1, 5.1, 7.1, 8.1, 8.2, 12.1, 13.2, 14.1, 15.1, 16.1, 17.1, 18.1, 19.1_

  - [x] 6.2 Audit and fix `mui/src/switch.tsx`
    - Verify sizing, shape, color roles for track/thumb
    - Ensure cursor-pointer, disabled treatment, state layers
    - _Requirements: 3.3, 4.1, 5.1, 7.1, 8.1, 8.2, 13.2, 15.1, 16.1, 18.1_

  - [x] 6.3 Audit and fix `mui/src/checkbox.tsx`
    - Verify 48dp touch target, state layers, cursor, disabled, focus ring
    - Ensure correct color roles (primary filled, outline border)
    - _Requirements: 4.1, 5.1, 7.1, 8.1, 8.2, 13.2, 14.1, 15.1, 16.1, 18.1_

  - [x] 6.4 Audit and fix `mui/src/radio.tsx`
    - Verify 48dp touch target, state layers, cursor, disabled, focus ring
    - Ensure correct color roles and RadioGroup tab management
    - _Requirements: 4.1, 5.1, 7.1, 8.1, 8.2, 13.2, 14.1, 15.1, 16.1, 18.1, 18.4_

  - [x] 6.5 Audit and fix `mui/src/slider.tsx`
    - Verify track/thumb sizing, color roles, cursor (grab/grabbing)
    - Ensure disabled treatment, state layers, focus ring
    - _Requirements: 3.3, 5.1, 7.1, 8.1, 8.3, 13.2, 15.1, 16.1, 18.1_

- [x] 7. Checkpoint — Verify buttons and controls audit
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Deep audit — Tabs, List, Menu
  - [x] 8.1 Audit and fix `mui/src/tabs.tsx`
    - Verify `label-large` for tab labels
    - Ensure state layers, cursor-pointer, active indicator animation
    - Verify M3 easing on tab indicator, disabled treatment
    - Ensure focus ring and tab navigation (tabIndex management)
    - _Requirements: 7.1, 8.1, 9.1, 12.1, 13.2, 15.1, 16.1, 17.1, 18.1, 18.4_

  - [x] 8.2 Audit and fix `mui/src/list.tsx`
    - Verify `body-medium` for list item text
    - Ensure state layers on interactive list items, cursor, focus ring
    - Verify icon alignment and sizing (20dp standard)
    - _Requirements: 3.1, 5.1, 7.1, 8.1, 12.2, 13.2, 15.1, 17.2, 18.1, 19.1, 19.2_

  - [x] 8.3 Audit and fix `mui/src/menu.tsx`
    - Verify `body-medium` for menu item text
    - Ensure state layers, cursor, focus ring, keyboard navigation
    - Verify shape (md/12px), elevation, z-index
    - Verify M3 animation easing for open/close
    - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 11.1, 12.2, 13.2, 15.1, 18.1_

- [x] 9. Deep audit — Card, Toolbar, App Bar
  - [x] 9.1 Audit and fix `mui/src/card.tsx`
    - Verify shape: md (12px) border radius
    - Verify elevation: elevated=level 1, hover=level 2
    - Verify 16px internal padding, color roles
    - Ensure disabled treatment removes elevation
    - _Requirements: 3.1, 4.1, 5.1, 6.1, 6.2, 7.1, 12.3, 13.2, 15.1, 16.1, 16.3_

  - [x] 9.2 Audit and fix `mui/src/toolbar.tsx`
    - Verify spacing, color roles, icon sizes
    - Ensure composability: uses Icon component
    - _Requirements: 3.1, 5.1, 12.3, 13.2, 19.1, 23.3_

  - [x] 9.3 Audit and fix `mui/src/app-bar.tsx`
    - Verify `title-large`/`title-medium` for headline text
    - Verify elevation on scroll behavior if applicable
    - Ensure z-index: z-30–z-40 range
    - Verify icon size: 24dp
    - _Requirements: 3.1, 5.1, 6.1, 11.1, 12.3, 13.2, 19.1_

- [x] 10. Deep audit — Dialog, Sheets, Snackbar, Tooltip
  - [x] 10.1 Audit and fix `mui/src/dialog.tsx`
    - Verify shape: xl (28px) border radius
    - Verify scrim: `on-surface` at 32% opacity (0.32)
    - Verify elevation: level 3
    - Ensure M3 emphasized easing for open, accelerate for close
    - Verify z-index: z-50+
    - Ensure composability: uses `IconButton` for close, `Button` for actions
    - _Requirements: 4.1, 5.1, 6.1, 9.1, 9.2, 9.3, 11.1, 13.2, 15.1, 22.1, 22.2, 23.1, 23.2_

  - [x] 10.2 Audit and fix `mui/src/sheets/bottom-sheet.tsx` and `mui/src/sheets/side-sheet.tsx`
    - Verify shape, scrim, elevation, easing
    - Ensure composability: uses `IconButton` for close
    - Verify z-index layering
    - _Requirements: 4.1, 5.1, 6.1, 9.1, 9.2, 11.1, 13.2, 15.1, 22.1, 22.2, 23.1_

  - [x] 10.3 Audit and fix `mui/src/snackbar.tsx`
    - Verify shape, elevation, color roles
    - Ensure composability: uses `Button` for action, `IconButton` for dismiss
    - Verify z-index: z-70
    - Verify M3 motion for enter/exit
    - _Requirements: 4.1, 5.1, 6.1, 9.1, 11.1, 13.2, 15.1, 23.1, 23.2_

  - [x] 10.4 Audit and fix `mui/src/tooltip.tsx`
    - Verify shape (sm/8px), color roles, type scale
    - Verify z-index: z-60
    - Verify M3 fade animation timing
    - _Requirements: 4.1, 5.1, 9.1, 11.1, 12.2, 13.2, 15.1, 17.2_

- [x] 11. Deep audit — Search, Text Field
  - [x] 11.1 Audit and fix `mui/src/search.tsx`
    - Verify shape (full), sizing, color roles
    - Ensure cursor-text on input area
    - Verify state layers, focus ring, disabled treatment
    - _Requirements: 3.1, 4.1, 5.1, 7.1, 8.5, 13.2, 15.1, 16.1, 18.1_

  - [x] 11.2 Audit and fix `mui/src/text-field.tsx`
    - Verify shape, sizing, color roles for filled/outlined variants
    - Ensure cursor-text, state layers, focus ring, disabled treatment
    - Verify label animation uses M3 easing
    - _Requirements: 3.1, 4.1, 5.1, 7.1, 8.5, 9.1, 13.2, 15.1, 16.1, 18.1_

- [x] 12. Checkpoint — Verify containers and overlays audit
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Deep audit — Navigation Bar, Navigation Rail
  - [x] 13.1 Audit and fix `mui/src/navigation/navigation-bar.tsx`
    - Verify `label-medium` for navigation labels
    - Verify state layers, cursor, active indicator shape
    - Ensure icon size: 24dp, active indicator animation with M3 easing
    - Verify z-index (z-30–z-40)
    - _Requirements: 3.1, 4.1, 5.1, 7.1, 8.1, 9.1, 11.1, 12.1, 13.2, 14.1, 15.1, 18.1, 19.1, 23.4_

  - [x] 13.2 Audit and fix `mui/src/navigation/navigation-rail.tsx`
    - Same audit dimensions as Navigation Bar
    - Ensure shared patterns with Navigation Bar (composability)
    - _Requirements: 3.1, 4.1, 5.1, 7.1, 8.1, 9.1, 11.1, 12.1, 13.2, 14.1, 15.1, 18.1, 19.1, 23.4_

- [x] 14. Deep audit — Carousel, Pickers, Indicators
  - [x] 14.1 Audit and fix `mui/src/carousel.tsx`
    - Verify spacing, shape, indicator styling
    - Ensure navigation controls use IconButton
    - Verify M3 motion for slide transitions
    - _Requirements: 3.1, 4.1, 9.1, 13.2, 15.1, 23.3_

  - [x] 14.2 Audit and fix `mui/src/pickers/date-picker.tsx` and `mui/src/pickers/time-picker.tsx`
    - Verify shape, color roles, elevation
    - Ensure state layers on selectable items, cursor, focus ring
    - Verify composability with Button/IconButton
    - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 13.2, 15.1, 18.1, 23.2, 23.3_

  - [x] 14.3 Audit and fix `mui/src/indicators/linear-progress.tsx`, `circular-progress.tsx`, `loading-indicator.tsx`
    - Verify color roles (primary track, surface-variant background)
    - Verify shape for linear track (full rounded)
    - Ensure animation uses correct M3 timing
    - _Requirements: 4.1, 5.1, 9.1, 13.2_

- [x] 15. Deep audit — Verify no ripple effects across entire library
  - Grep/confirm that no component uses expanding-circle or ripple keyframes
  - Verify all state feedback is flat state layer transitions
  - _Requirements: 21.1, 21.2_

- [ ]* 16. Write property tests for deep audit invariants
  - **Property 6: Interactive components apply correct state layer opacities**
  - **Property 7: Interactive components display cursor-pointer when enabled**
  - **Property 8: Disabled components apply M3 disabled treatment**
  - **Property 9: Interactive components show focus-visible ring**
  - **Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.2, 16.1, 16.4, 16.5, 18.1, 18.2**

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The deep audit follows dependency order: buttons first (referenced by other components), then progressively more complex components
- All corrections use TypeScript with Tailwind v4 canonical classes
- State layers use `hsl(var(--token)/opacity)` pattern — no ripple effects
