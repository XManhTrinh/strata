# Implementation Plan: M3 Dialog Variants Audit

## Overview

This plan covers enhancing the `@vkieu/mui` Dialog component to support all five M3 Expressive dialog variants (basic, icon, full-screen, alert, scrollable) for web/React, then migrating the Strata application's custom `ConfirmDialog` to use the library component. Key M3 Expressive principles: tonal elevation (no shadows), spring physics motion, semantic shape tokens, and section-specific padding. Work proceeds from library-level component changes, through testing, to application-level migration and documentation.

## Tasks

- [x] 1. Add alert dialog variant to DialogContent
  - [x] 1.1 Implement the `alert` prop on DialogContent
    - Add `alert?: boolean` to the DialogContent props interface in `/Users/xuan-manh.trinh/workplace/web/mui/src/dialog.tsx`
    - When `alert={true}`, set `role="alertdialog"` on the Radix Content element
    - Attach `onEscapeKeyDown={(e) => e.preventDefault()}` to block Escape dismissal
    - Attach `onPointerDownOutside={(e) => e.preventDefault()}` to block overlay click dismissal
    - Attach `onInteractOutside={(e) => e.preventDefault()}` as a fallback
    - Set `aria-labelledby` pointing to DialogTitle's generated ID and `aria-describedby` pointing to DialogDescription's generated ID
    - On mount (`onOpenAutoFocus`), move focus to the first focusable button in DialogFooter
    - Preserve existing container styling (same dimensions, radius, padding as basic variant)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 1.2 Write property test for alert dismissal invariant
    - **Property 1: Alert dialog dismissal invariant**
    - Using `fast-check`, generate arbitrary dialog configurations (varying content lengths, button counts)
    - Render with `alert={true}`, simulate overlay clicks and Escape presses
    - Assert dialog remains open and visible after each dismissal attempt
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ]* 1.3 Write unit tests for alert dialog variant
    - Test that `role="alertdialog"` is rendered when `alert={true}`
    - Test that `aria-labelledby` and `aria-describedby` are correctly set
    - Test initial focus placement on first footer button
    - Test that overlay click does NOT dismiss the dialog
    - Test that Escape key does NOT dismiss the dialog
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

  - [ ]* 1.4 Write property test for non-alert overlay dismissal
    - **Property 4: Non-alert overlay dismissal**
    - Using `fast-check`, generate dialog configurations without `alert` prop
    - Simulate overlay click, assert `onOpenChange(false)` is called
    - **Validates: Requirements 6.6**

- [x] 2. Add scrollable content handling with dynamic dividers
  - [x] 2.1 Implement overflow detection and divider rendering in DialogContent
    - Create a `useOverflowDetection` hook using `ResizeObserver` + `useRef` that returns `isOverflowing: boolean`
    - The hook observes the content area between DialogHeader and DialogFooter
    - When `scrollHeight > clientHeight`, set `isOverflowing` to `true`
    - Render a 1px `border-outline-variant` divider below the header when overflowing
    - Render a 1px `border-outline-variant` divider above the footer when overflowing
    - Hide both dividers when content does NOT overflow
    - Apply `overflow-y: auto` to the scrollable content area
    - Ensure the title section and action buttons remain in fixed positions (not scrolling with content)
    - Handle ResizeObserver not supported: fallback to always showing dividers above a static threshold
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 2.2 Write property test for overflow–divider biconditional
    - **Property 2: Overflow–divider biconditional**
    - Using `fast-check`, generate content of varying heights (0 to 2000px)
    - Render inside a constrained dialog, measure scrollHeight vs clientHeight
    - Assert divider presence matches overflow state exactly (both visible when overflowing, neither visible when not)
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6**

  - [ ]* 2.3 Write property test for title/actions positional invariant during scroll
    - **Property 3: Title and actions positional invariant during scroll**
    - Using `fast-check`, generate random scroll positions
    - Programmatically scroll, read title/actions bounding rects
    - Assert they haven't moved from initial position
    - **Validates: Requirements 5.5**

  - [ ]* 2.4 Write unit tests for scrollable dialog behavior
    - Test that dividers appear when content overflows
    - Test that dividers disappear when content fits
    - Test that viewport resize triggers divider state update without reopening dialog
    - Test `overflow-y: auto` is applied to scrollable content area
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.8_

- [ ] 3. Verify and fix M3 visual spec compliance for basic and icon variants
  - [x] 3.1 Audit and fix basic dialog styling gaps (M3 Expressive)
    - Verify `surface-container-high` background in `/Users/xuan-manh.trinh/workplace/web/mui/src/dialog.tsx`
    - Update corner radius to use semantic token: `rounded-[var(--corner-extra-large,28px)]`
    - Update padding to M3 Expressive section-specific structure:
      - Headline section: `pt-[6px] px-6 pb-[13px]`
      - Content section: `pt-5 px-6`
      - Actions section: `pt-4 px-6 pb-6`
    - Remove any `p-6` uniform padding on the container (padding is per-section)
    - Verify min-width 280px (`min-w-[280px]`) and max-width 560px (`max-w-[560px]`)
    - Verify max-height constraint of `max-h-[90vh]` on the container
    - Verify title uses Headline Small: `text-[24px] leading-8 font-normal` with `on-surface` color
    - Verify description uses Body Medium: `text-[14px] leading-5 font-normal tracking-[0.25px]` with `on-surface-variant` color
    - Verify action buttons are end-aligned with 8px gap (`justify-end gap-2`)
    - Remove any box-shadow/elevation shadow — M3 Expressive uses tonal elevation only (`shadow-none`)
    - Fix any discrepancies found
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_

  - [x] 3.2 Audit and fix icon dialog variant styling
    - Verify icon renders horizontally centered above title with 24dp size when `icon` prop is set
    - Verify `secondary` color token applied to hero icon (`text-secondary`)
    - Verify center-aligned layout for title and description when icon is present
    - Verify 16dp gap between icon and title
    - Verify same container dimensions as basic variant are maintained
    - Fix any discrepancies found
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Audit and fix full-screen dialog variant
    - Verify mobile full-screen: 0dp radius, 100% viewport, inset 0 below `sm` breakpoint
    - Verify 56dp header bar with close icon (24dp) and Title Large typography
    - Verify close icon dismisses dialog
    - Verify desktop fallback: centered dialog with `corner-extra-large` (28px) radius, standard dimensions
    - Replace fixed-duration slide animation with spring-based physics motion (stiffness: ~300, damping: ~25)
    - Verify content area uses `overflow-y` scrolling with proper padding
    - Verify `surface-container-high` background on full-screen variant (no shadow)
    - Fix any discrepancies found
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Verify scrim and overlay behavior
  - [x] 4.1 Audit and fix scrim styling and animation (M3 Expressive)
    - Verify scrim uses `bg-[hsl(var(--on-surface)/0.32)]` for 32% on-surface opacity
    - Replace CSS cubic-bezier transitions with spring-based physics motion:
      - Scrim open: spring fade-in (stiffness: 300, damping: 30)
      - Scrim close: spring fade-out (stiffness: 400, damping: 35)
    - Implement using framer-motion or react-spring for spring interpolation
    - Add CSS fallback for no-JS: `transition: opacity 150ms ease-out`
    - Verify fixed position with `inset-0` at `z-50`
    - Verify scrim blocks pointer events on content beneath
    - Verify clicking scrim dismisses dialog when `alert` is NOT true
    - Fix any discrepancies in `/Users/xuan-manh.trinh/workplace/web/mui/src/dialog.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 5. Checkpoint - Library component changes verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Migrate Strata ConfirmDialog to @vkieu/mui Dialog
  - [x] 6.1 Replace ConfirmDialog usage with @vkieu/mui Dialog alert variant
    - Update all usages in `apps/web/` that import from `packages/ui` ConfirmDialog
    - Replace with `@vkieu/mui` Dialog using `alert` prop, DialogContent with confirm/cancel buttons in DialogFooter
    - For delete confirmations, use the Dialog with `icon="delete"` and `alert` props
    - Ensure `onOpenChange` callback handles close from action buttons only
    - _Requirements: 7.1, 7.2_

  - [x] 6.2 Apply fullScreen prop for dialogs with 5+ form fields
    - Identify any dialogs in the Strata application containing 5 or more input elements
    - Set `fullScreen` prop on those DialogContent instances
    - Ensure content area is scrollable with proper max-height constraint
    - _Requirements: 7.3, 7.4_

  - [x] 6.3 Deprecate the custom ConfirmDialog component
    - Add `@deprecated` JSDoc annotation to `ConfirmDialog` in `/Users/xuan-manh.trinh/workplace/web/strata/packages/ui/src/confirm-dialog.tsx`
    - Verify no remaining imports of `ConfirmDialog` in `apps/web/`
    - Remove the export from `/Users/xuan-manh.trinh/workplace/web/strata/packages/ui/src/index.ts` if no other packages depend on it
    - _Requirements: 7.1_

  - [ ]* 6.4 Write property test for form field count triggering fullScreen
    - **Property 5: Form field count triggers fullScreen**
    - Using `fast-check`, generate form content with N input fields (0–20)
    - For N >= 5, assert `fullScreen` prop is applied; for N < 5, assert it is not
    - **Validates: Requirements 7.3**

  - [ ]* 6.5 Write integration tests for migration
    - Test that `ConfirmDialog` from `packages/ui/` is no longer imported in `apps/web/`
    - Test delete confirmation flow using the new alert dialog with icon
    - Test responsive full-screen behavior (mobile → full-screen, desktop → centered)
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 7. Checkpoint - Strata migration verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update documentation and showcase page
  - [x] 8.1 Add alert and scrollable variant showcases to dialog docs page
    - Update `/Users/xuan-manh.trinh/workplace/web/mui/docs/src/app/feedback/dialog/page.tsx`
    - Add a Showcase section for the alert dialog variant demonstrating blocked outside-click and Escape-key dismissal
    - Add a Showcase section for the scrollable dialog variant demonstrating visible dividers and scrollable content area
    - Each section must include a trigger button that opens the dialog and allows dismissal
    - Include copyable source code snippets toggled via the existing Showcase component
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [x] 8.2 Add props reference table to dialog docs page
    - Add a props table listing all DialogContent props: `fullScreen`, `icon`, `alert`, `showClose`, `className`, `children`
    - Include columns for prop name, type, default value, and description
    - Use the existing `PropsTable` component from `/Users/xuan-manh.trinh/workplace/web/mui/docs/src/components/props-table.tsx`
    - _Requirements: 8.3_

  - [ ]* 8.3 Write unit tests for documentation page completeness
    - Test that the dialog docs page renders 5 showcase sections (basic, icon, full-screen, alert, scrollable)
    - Test that each section contains a trigger button
    - Test that props table renders with all expected props
    - _Requirements: 8.1, 8.3_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The `@vkieu/mui` library lives at `/Users/xuan-manh.trinh/workplace/web/mui` — all component changes are made there
- The Strata application lives at `/Users/xuan-manh.trinh/workplace/web/strata` — migration tasks target `apps/web/` and `packages/ui/`
- The existing dialog component already supports basic, icon, and full-screen variants — tasks 3.x audit and fix rather than implement from scratch

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "3.2", "3.3", "4.1"] },
    { "id": 1, "tasks": ["2.1", "1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["6.1", "6.2"] },
    { "id": 4, "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 5, "tasks": ["8.1", "8.2"] },
    { "id": 6, "tasks": ["8.3"] }
  ]
}
```
