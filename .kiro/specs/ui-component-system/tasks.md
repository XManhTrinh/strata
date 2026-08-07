# Implementation Plan: UI Component System

## Overview

This plan implements a shadcn/ui component library with M3 theming, Framer Motion animations, Sonner toast notifications, and full page migrations. Each phase builds incrementally: foundation utilities first, then core components, then toast system, then page-by-page migration, and finally layout refactoring.

## Tasks

- [ ] 1. Foundation Setup
  - [x] 1.1 Install dependencies in `apps/web/`
    - Run: `npm install clsx class-variance-authority @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-avatar @radix-ui/react-label @radix-ui/react-separator sonner lucide-react`
    - Verify all packages appear in `apps/web/package.json` dependencies
    - _Requirements: 2.2_

  - [ ] 1.2 Create `cn()` utility in `apps/web/src/lib/utils.ts`
    - Implement `cn()` combining `clsx` with `twMerge` from `tailwind-merge`
    - Export as named export
    - _Requirements: 2.3, 2.4_

  - [ ] 1.3 Create motion variants module at `apps/web/src/lib/motion.ts`
    - Define `dialogOverlayVariants`, `dialogContentVariants`, `pageTransitionVariants`, `skeletonShimmerVariants`, `dropdownVariants`, `sheetVariants`
    - Define `defaultTransition` (200ms, M3 standard easing `[0.4, 0, 0.2, 1]`) and `springTransition`
    - Implement `resolveAnimationVariants()` helper that zeros durations when `reducedMotion` is true
    - Use only `opacity`, `scale`, `x`, `y`, `backgroundPosition` properties (GPU-composited)
    - _Requirements: 3.1, 3.7, 3.8_

  - [ ] 1.4 Add M3 color tokens to `apps/web/src/app/globals.css`
    - Define CSS custom properties in `:root` for light mode: `--primary`, `--on-primary`, `--primary-container`, `--on-primary-container`, `--secondary`, `--on-secondary`, `--secondary-container`, `--on-secondary-container`, `--tertiary`, `--on-tertiary`, `--tertiary-container`, `--on-tertiary-container`, `--surface`, `--on-surface`, `--surface-variant`, `--on-surface-variant`, `--outline`, `--outline-variant`, `--error`, `--on-error`
    - Define dark mode equivalents inside `.dark` selector
    - Add shadcn-required variables: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`
    - Define M3 elevation levels (0–5) using surface tint at progressive opacities
    - Define M3 state layer tokens: `--state-hover` (8%), `--state-focus` (12%), `--state-press` (12%)
    - Map all tokens to Tailwind via `@theme` directive
    - Ensure minimum 4.5:1 contrast ratio for text token pairs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.6_

  - [ ]* 1.5 Write property tests for `cn()` utility
    - **Property 1: cn() Tailwind class conflict resolution**
    - **Validates: Requirement 2.3**
    - Use fast-check to generate pairs of conflicting Tailwind classes and assert last-wins behavior

  - [ ]* 1.6 Write property tests for motion variants
    - **Property 3: Reduced motion disables all animation durations**
    - **Validates: Requirement 3.7**
    - Use fast-check to generate arbitrary Variants objects and assert all durations are 0 when reducedMotion is true
    - **Property 4: Animation variants use only GPU-composited properties**
    - **Validates: Requirement 3.8**
    - Assert exported variants only animate `opacity`, `scale`, `x`, `y`, `rotate`, `backgroundPosition`

- [ ] 2. Core UI Components
  - [ ] 2.1 Create `apps/web/src/components/ui/button.tsx`
    - Use `class-variance-authority` for variant management
    - Variants: default, destructive, outline, secondary, ghost, link
    - Sizes: default, sm, lg, icon
    - Support `asChild` via `@radix-ui/react-slot`
    - Accept `className` prop merged via `cn()`
    - Ensure minimum 44×44px touch target on mobile
    - _Requirements: 2.1, 2.5, 2.6, 7.5_

  - [ ] 2.2 Create `apps/web/src/components/ui/input.tsx`
    - Consistent focus ring styling using M3 tokens
    - Support error state with `aria-invalid` and `aria-describedby`
    - Accept `className` prop merged via `cn()`
    - _Requirements: 2.1, 2.5, 6.7_

  - [ ] 2.3 Create `apps/web/src/components/ui/label.tsx`
    - Use `@radix-ui/react-label` primitive
    - Accept `className` prop merged via `cn()`
    - _Requirements: 2.1, 2.5_

  - [ ] 2.4 Create `apps/web/src/components/ui/select.tsx`
    - Use `@radix-ui/react-select` primitive
    - Export `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`
    - Support keyboard navigation (Arrow keys, Enter, Escape)
    - Accept `className` prop on all sub-components
    - _Requirements: 2.1, 2.5, 6.4_

  - [ ] 2.5 Create `apps/web/src/components/ui/dialog.tsx`
    - Use `@radix-ui/react-dialog` primitive
    - Export `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`
    - Implement focus trap (focus stays within dialog)
    - Move focus to first focusable element on open
    - Return focus to trigger on close
    - Responsive: full-width on mobile (<640px), max-w-md/lg on desktop
    - _Requirements: 2.1, 6.1, 6.2, 6.3, 7.4_

  - [ ] 2.6 Create `apps/web/src/components/ui/animated-dialog.tsx`
    - Wrap Dialog with Framer Motion `AnimatePresence`
    - Overlay: fade-in 200ms on open, fade-out 150ms on close
    - Content: scale 0.95→1 + fade-in 200ms on open, scale 1→0.95 + fade-out 150ms on close
    - Use `dialogOverlayVariants` and `dialogContentVariants` from `lib/motion.ts`
    - Respect `prefers-reduced-motion` (instant transitions)
    - _Requirements: 3.2, 3.3_

  - [ ] 2.7 Create `apps/web/src/components/ui/sheet.tsx`
    - Use `@radix-ui/react-dialog` as primitive base
    - Export `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetClose`
    - Animate slide-in from left edge using `sheetVariants` with spring physics (200ms)
    - Include overlay backdrop that dismisses on tap
    - _Requirements: 2.1, 3.6, 7.2, 7.7_

  - [ ] 2.8 Create `apps/web/src/components/ui/card.tsx`
    - Export `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
    - Style with M3 surface tokens and elevation
    - Accept `className` prop on all sub-components
    - _Requirements: 2.1, 2.5_

  - [ ] 2.9 Create `apps/web/src/components/ui/skeleton.tsx`
    - Shimmer animation using `skeletonShimmerVariants` from motion.ts
    - Accept `className` for sizing
    - _Requirements: 2.1, 3.5_

  - [ ] 2.10 Create `apps/web/src/components/ui/separator.tsx`
    - Use `@radix-ui/react-separator` primitive
    - Support horizontal and vertical orientations
    - Accept `className` prop
    - _Requirements: 2.1, 2.5_

  - [ ] 2.11 Create remaining components: `table.tsx`, `tabs.tsx`, `dropdown-menu.tsx`, `avatar.tsx`, `badge.tsx`
    - `apps/web/src/components/ui/table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell
    - `apps/web/src/components/ui/tabs.tsx` — Use `@radix-ui/react-tabs`, keyboard accessible
    - `apps/web/src/components/ui/dropdown-menu.tsx` — Use `@radix-ui/react-dropdown-menu`, animate with `dropdownVariants`
    - `apps/web/src/components/ui/avatar.tsx` — Use `@radix-ui/react-avatar`, fallback initials
    - `apps/web/src/components/ui/badge.tsx` — Use `class-variance-authority` for variant management
    - All components accept `className` prop via `cn()`
    - _Requirements: 2.1, 2.5, 6.4_

  - [ ]* 2.12 Write property test for className passthrough
    - **Property 2: className prop passthrough**
    - **Validates: Requirement 2.5**
    - For each component, render with arbitrary className and assert it appears in DOM output

- [ ] 3. Toast Notification System
  - [ ] 3.1 Create `apps/web/src/components/ui/sonner.tsx`
    - Export a `Toaster` wrapper component that configures Sonner
    - Position: bottom-right
    - Duration: 4000ms auto-dismiss
    - Max visible: 3 toasts
    - Style with M3 tokens (surface-container background, on-surface text, primary accent, error accent)
    - Set `role="status"` and `aria-live="polite"` for accessibility
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7, 4.8, 6.8_

  - [ ] 3.2 Add `<Toaster />` to root layout at `apps/web/src/app/layout.tsx`
    - Import Toaster from `@/components/ui/sonner`
    - Place inside the body, after providers
    - _Requirements: 4.1_

- [ ] 4. Checkpoint — Foundation and components complete
  - Ensure the project builds successfully (`npm run build` in `apps/web`)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Page Migrations Phase 1
  - [x] 5.1 Migrate login page at `apps/web/src/app/(auth)/login/page.tsx`
    - Replace raw `<button>` elements with `Button` component
    - Replace raw `<input>` elements with `Input` component
    - Replace raw `<label>` elements with `Label` component
    - Add `Separator` between login methods if applicable
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 5.2 Migrate dashboard page at `apps/web/src/app/(dashboard)/dashboard/page.tsx`
    - Replace stat/metric containers with `Card` components
    - Add `Skeleton` loading states for async data
    - Replace raw buttons with `Button` component
    - Apply page transition animation using `pageTransitionVariants`
    - _Requirements: 5.1, 5.10_

  - [x] 5.3 Migrate people page at `apps/web/src/app/(dashboard)/people/page.tsx`
    - Replace raw buttons with `Button` component
    - Replace raw inputs with `Input` and `Label`
    - Replace custom modal overlays with `AnimatedDialog`
    - Replace raw tables with `Table` component
    - Add `toast.success()` / `toast.error()` to create/update/delete mutation callbacks
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.7_

  - [x] 5.4 Migrate employees page at `apps/web/src/app/(dashboard)/employees/page.tsx`
    - Replace raw buttons with `Button` component
    - Replace raw inputs with `Input` and `Label`
    - Replace raw `<select>` with `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
    - Replace custom modal overlays with `AnimatedDialog`
    - Replace raw tables with `Table` component
    - Add `toast.success()` / `toast.error()` to mutation callbacks
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8_

  - [ ]* 5.5 Write unit tests for page migrations Phase 1
    - Test login page renders with Button, Input, Label components (no raw HTML equivalents)
    - Test people page dialog open/close flow
    - Test employees page select interaction
    - Test toast calls on mutation success/error
    - _Requirements: 5.6, 5.7, 5.8_

- [x] 6. Page Migrations Phase 2
  - [x] 6.1 Migrate settings/roles page at `apps/web/src/app/(dashboard)/settings/roles/page.tsx`
    - Replace buttons, inputs, selects, and dialogs with shadcn components
    - Add toast notifications to CRUD mutations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.9_

  - [x] 6.2 Migrate settings/org-structure page at `apps/web/src/app/(dashboard)/settings/org-structure/page.tsx`
    - Replace buttons, inputs, and dialogs with shadcn components
    - Add toast notifications to CRUD mutations
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.9_

  - [x] 6.3 Migrate settings/positions page at `apps/web/src/app/(dashboard)/settings/positions/page.tsx`
    - Replace buttons, inputs, and dialogs with shadcn components
    - Add toast notifications to CRUD mutations
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.9_

  - [x] 6.4 Migrate settings/features page at `apps/web/src/app/(dashboard)/settings/features/page.tsx`
    - Replace buttons and inputs with shadcn components
    - _Requirements: 5.1, 5.2, 5.9_

  - [x] 6.5 Migrate engineering page at `apps/web/src/app/(dashboard)/engineering/page.tsx`
    - Replace buttons with `Button`, containers with `Card`
    - _Requirements: 5.1_

  - [x] 6.6 Migrate capacity page at `apps/web/src/app/(dashboard)/capacity/page.tsx`
    - Replace buttons with `Button`, containers with `Card`
    - _Requirements: 5.1_

  - [x] 6.7 Migrate calendar page at `apps/web/src/app/(dashboard)/calendar/page.tsx`
    - Replace buttons with `Button`, containers with `Card`
    - _Requirements: 5.1_

  - [x] 6.8 Migrate reports page at `apps/web/src/app/(dashboard)/reports/page.tsx`
    - Replace buttons with `Button`, selects with `Select`
    - _Requirements: 5.1, 5.3_

  - [x] 6.9 Migrate audit page at `apps/web/src/app/(dashboard)/audit/page.tsx`
    - Replace buttons with `Button`, selects with `Select`, tables with `Table`
    - _Requirements: 5.1, 5.3_

  - [ ]* 6.10 Write unit tests for page migrations Phase 2
    - Test settings pages render with shadcn components
    - Test toast integration on mutations
    - _Requirements: 5.9_

- [x] 7. Layout Components (Responsive Sidebar + Header)
  - [x] 7.1 Refactor sidebar at `apps/web/src/components/layout/sidebar.tsx`
    - On viewports ≥768px: render sidebar as persistent panel (current behavior)
    - On viewports <768px: hide sidebar, render inside a `Sheet` component triggered from mobile nav
    - Sheet slides in from left edge with overlay backdrop
    - Use `sheetVariants` animation from motion.ts
    - _Requirements: 7.2, 7.3, 7.7_

  - [x] 7.2 Refactor header at `apps/web/src/components/layout/header.tsx`
    - Add mobile menu trigger button (visible <768px) that opens the sidebar Sheet
    - Replace any custom dropdown with `DropdownMenu` component for user/notification menus
    - Use `Avatar` component for user avatar in header
    - Ensure 44×44px minimum touch targets for mobile
    - _Requirements: 7.1, 7.5_

  - [x] 7.3 Update dashboard layout at `apps/web/src/app/(dashboard)/layout.tsx`
    - Wire responsive sidebar logic (Sheet on mobile, persistent on desktop)
    - Ensure mobile-first base styles with progressive breakpoint enhancements
    - Add horizontal scroll wrapper or stacked card layout for data tables on mobile
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

  - [ ]* 7.4 Write integration tests for responsive layout
    - Test sidebar hidden on mobile viewport
    - Test Sheet opens on mobile menu trigger
    - Test sidebar visible as persistent panel on desktop
    - _Requirements: 7.2, 7.3_

- [x] 8. Final Checkpoint
  - Run full build (`npm run build` in `apps/web`)
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no raw `<button>`, `<input>`, or `<select>` elements remain in migrated pages
  - Verify no console errors in migrated pages

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `motion` package (Framer Motion) and `tailwind-merge` are already installed — no duplicate installation needed
- Components are installed as owned source code in `components/ui/`, not from node_modules
