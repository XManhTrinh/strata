# Implementation Plan: M3 Buttons

## Overview

This plan implements the complete Material Design 3 button system for the Strata web app, replacing the existing `Button` component and adding `IconButton`, `FAB`, and `SegmentedButtonGroup` components. Implementation proceeds bottom-up: theme tokens first, then components from simplest (Button) to most complex (SegmentedButtonGroup), with tests interspersed close to their related implementation.

## Tasks

- [x] 1. Add missing theme tokens and Tailwind mappings
  - [x] 1.1 Add surface-container-low, surface-container-high, and shape tokens to globals.css
    - Add `--surface-container-low` and `--surface-container-high` CSS custom properties to both `:root` and `.dark` blocks
    - Add shape scale tokens (`--shape-full`, `--shape-xl`, `--shape-lg`, `--shape-md`, `--shape-sm`) to `:root`
    - Add corresponding `@theme` color mappings for `--color-surface-container-low` and `--color-surface-container-high`
    - _Requirements: 1.5, 6.6 (elevated bg needs surface-container-low; FAB surface needs surface-container-high)_

- [x] 2. Implement the Button component
  - [x] 2.1 Rebuild the Button component with M3 variants, sizes, state layers, icon support, and loading state
    - Replace content of `apps/web/src/components/ui/button.tsx`
    - Define CVA with variants: `filled`, `outlined`, `text`, `elevated`, `tonal`
    - Define sizes: `small` (h-[34px]), `medium` (h-10), `large` (h-12), `extra-large` (h-14)
    - Implement state layer via `before:` pseudo-element pattern (hover 8%, focus 12%, press 12%)
    - Implement `icon` and `trailingIcon` props with correct padding adjustments per size
    - Implement `loading` prop with spinner, `aria-busy`, and pointer-events-none at full opacity
    - Implement disabled state (opacity-[0.38], pointer-events-none)
    - Apply M3 Label Large typography, rounded-full shape, 200ms transitions
    - Forward ref and support `asChild` via Radix Slot
    - Include internal `ButtonSpinner` component
    - Ensure touch target minimum 48px for small size via transparent padding
    - _Requirements: 1.1–1.11, 2.1–2.5, 3.1–3.5, 8.1, 8.4, 8.5, 9.1, 10.1, 10.5, 10.6, 11.1–11.4, 14.1_

  - [ ]* 2.2 Write property tests for Button (Properties 1, 2, 3, 12, 14, 15)
    - Create `apps/web/src/components/ui/__tests__/button.test.tsx`
    - Install `fast-check`, `@testing-library/react`, `@testing-library/jest-dom` as dev dependencies
    - Configure Jest for the web app (jest.config.ts, setup file for jest-dom)
    - **Property 1: Button base invariants persist across all variant/size combinations**
    - **Validates: Requirements 1.8, 1.10, 2.5**
    - **Property 2: State layer classes present for Button across all variants**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - **Property 3: Disabled Button prevents interaction with correct visual treatment**
    - **Validates: Requirements 2.4, 10.1**
    - **Property 12: Button touch target minimum of 48px**
    - **Validates: Requirements 9.1**
    - **Property 14: Loading state blocks interaction while maintaining full visibility**
    - **Validates: Requirements 11.3**
    - **Property 15: Loading state sets aria-busy**
    - **Validates: Requirements 11.4**

- [x] 3. Implement the IconButton component
  - [x] 3.1 Create the IconButton component with variants, shapes, toggle, and shape morph
    - Create `apps/web/src/components/ui/icon-button.tsx`
    - Define CVA with variants: `standard`, `filled`, `filled-tonal`, `outlined`
    - Define sizes: `small` (34px), `medium` (40px), `large` (48px), `extra-large` (56px)
    - Implement `shape` prop: `round` (default, rounded-full) and `square` (size-scaled radii)
    - Implement toggle behavior with `toggle`, `pressed`, `defaultPressed`, `onPressedChange` props
    - Toggle pressed → filled treatment; toggle unpressed → standard treatment
    - Implement shape morph on `:active` via CSS transition on border-radius (100ms)
    - Implement state layer pattern (same as Button)
    - Implement `compact` prop to remove touch-target padding; log dev warning
    - Ensure touch target 48px for small/medium sizes without compact
    - Set `aria-pressed` when toggle is enabled; `aria-disabled` + `tabIndex={-1}` when disabled
    - Require `aria-label` prop via TypeScript interface
    - Forward ref and support `asChild`
    - _Requirements: 4.1–4.15, 5.1–5.4, 8.2, 8.4, 8.6, 9.2, 9.4, 10.2, 10.4_

  - [ ]* 3.2 Write property tests for IconButton (Properties 4, 5, 6, 7, 13, 20)
    - Create `apps/web/src/components/ui/__tests__/icon-button.test.tsx`
    - **Property 4: IconButton with default shape is always circular**
    - **Validates: Requirements 4.7**
    - **Property 5: Toggle state alternates correctly on interaction**
    - **Validates: Requirements 4.11**
    - **Property 6: aria-pressed reflects actual toggle state**
    - **Validates: Requirements 5.2**
    - **Property 7: Disabled IconButton is removed from tab order with correct ARIA**
    - **Validates: Requirements 5.3**
    - **Property 13: IconButton touch target minimum of 48px for small and medium sizes**
    - **Validates: Requirements 9.2**
    - **Property 20: IconButton aria-label is always rendered**
    - **Validates: Requirements 5.1**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the FAB component
  - [x] 5.1 Create the FAB component with sizes, colors, shapes, loading, and fixed positioning
    - Create `apps/web/src/components/ui/fab.tsx`
    - Define CVA with sizes: `small` (40px, radius 12px), `medium` (56px, radius 16px), `large` (96px, radius 28px), `extended` (56px height, radius 16px, auto width)
    - Implement color variants: `primary`, `secondary`, `tertiary`, `surface` with correct container/on-container pairs
    - Implement `shape` prop: `rounded` (default, size-specific) and `round` (9999px)
    - Implement elevation Level 3 at rest, Level 4 on hover
    - Implement state layer pattern
    - Implement shape morph on press (20-30% reduction, 100ms)
    - Implement `fixed` prop for bottom-right viewport positioning with mobile nav offset
    - Implement `loading` prop with spinner and `aria-busy`
    - Require `aria-label` when size ≠ `extended`; derive name from label for extended
    - Implement `icon` prop (required) and `label` prop (for extended)
    - Forward ref and support `asChild`
    - _Requirements: 6.1–6.11, 7.1–7.5, 8.3, 8.4, 8.7, 9.3, 10.3, 11.5, 14.3_

  - [ ]* 5.2 Write property tests for FAB (Properties 8, 9, 10, 11)
    - Create `apps/web/src/components/ui/__tests__/fab.test.tsx`
    - **Property 8: FAB color variants always pair container background with matching on-container foreground**
    - **Validates: Requirements 6.6**
    - **Property 9: FAB elevation is present for all configurations**
    - **Validates: Requirements 6.7**
    - **Property 10: Non-extended FAB always has aria-label**
    - **Validates: Requirements 7.1**
    - **Property 11: asChild renders without wrapper and merges all props onto child**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [x] 6. Implement the SegmentedButtonGroup component
  - [x] 6.1 Create the SegmentedButtonGroup and SegmentedButton components
    - Create `apps/web/src/components/ui/segmented-button-group.tsx`
    - Implement `SegmentedButtonGroup` with `selectionMode` (`single`/`multiple`), `value`/`defaultValue`, `onValueChange`, `size`, `equalWidth` props
    - Implement `SegmentedButton` with `value`, `icon`, `label`, `disabled` props
    - Implement border-radius merging: first segment left-rounded, last segment right-rounded, middle segments 0px
    - Collapse shared borders between adjacent segments to single 1px outline
    - Implement selection visuals: selected → secondary-container bg + checkmark icon; unselected → transparent bg
    - Implement state layer on each segment
    - Implement keyboard navigation: ArrowLeft/Right between segments, Enter/Space to toggle, Home/End for first/last; skip disabled segments
    - Set `role="group"` on container; `role="radio"` + `aria-checked` (single) or `role="checkbox"` + `aria-checked` (multiple) on segments
    - Implement disabled segment rendering (38% opacity, excluded from keyboard nav)
    - Support `size`: `medium` (40px) and `small` (32px)
    - _Requirements: 12.1–12.16_

  - [ ]* 6.2 Write property tests for SegmentedButtonGroup (Properties 16, 17, 18, 19)
    - Create `apps/web/src/components/ui/__tests__/segmented-button-group.test.tsx`
    - **Property 16: Segmented group border-radius merging**
    - **Validates: Requirements 12.3**
    - **Property 17: Selection state correctness**
    - **Validates: Requirements 12.12**
    - **Property 18: Keyboard navigation skips disabled segments**
    - **Validates: Requirements 12.14**
    - **Property 19: ARIA roles match selection mode**
    - **Validates: Requirements 12.15**

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration wiring and dark mode verification
  - [x] 8.1 Export all components from a shared barrel and verify dark mode token usage
    - Ensure `Button`, `IconButton`, `FAB`, `SegmentedButtonGroup`, and `SegmentedButton` are properly exported
    - Verify all color classes reference CSS custom properties that have `.dark` overrides
    - Verify elevation tokens use dark-mode values in `.dark` context
    - _Requirements: 13.1, 13.2_

  - [ ]* 8.2 Write integration tests for dark mode, accessibility contrast, and reduced motion
    - Create `apps/web/src/components/ui/__tests__/button-integration.test.tsx`
    - Test that all button components render with correct classes when `.dark` is on root
    - Test `prefers-reduced-motion` global CSS effect on transitions
    - _Requirements: 13.1–13.3, 14.1–14.3_

- [x] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit/integration tests validate specific examples and edge cases
- The existing `prefers-reduced-motion` global rule in `globals.css` already handles requirement 14 (zero-duration transitions) — components only need to avoid inline animation overrides
- All components use the same state layer and CVA patterns for consistency with the existing `Chip` component
