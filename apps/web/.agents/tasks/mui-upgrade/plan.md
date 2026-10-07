# @vkieu/mui Upgrade — Implementation Plan

> Package was already reinstalled and CSS tokens generated (see `install-status.md`).
> All new export names verified against:
>   - `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/.agents/tasks/mui-upgrade/new-api-surface.md`
>   - `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/node_modules/@vkieu/mui/dist/index.d.ts`
>   - Individual component `.d.ts` files under `dist/components/`

---

## Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Use `createTheme({ name: 'facebook', seed: '#1877F2' })` for the custom theme | The old `theme-facebook.css` is gone; `createTheme` generates an equivalent M3 palette from the brand color. |
| 2 | Create `src/lib/snackbar.ts` with `SnackbarContext` + `useSnackbar()` hook | `SnackbarHostState` is a class instance that must be shared between `Providers` (which renders `SnackbarHost`) and callers like `use-toast.ts`. A React context is the idiomatic approach without adding a global singleton. |
| 3 | Delete `src/lib/theme.ts`; replace all callers with `useTheme` from `@vkieu/mui` | The new `ThemeProvider` manages theming fully. Old callers using `theme` (light/dark/system) switch to `mode` from the new hook. |
| 4 | Rename old Typography color tokens in the polyfill | New `@theme` mapping uses `on-surface`, `on-surface-variant` etc. (M3 canonical). `surface-foreground` and `*-foreground` variants do not exist in the new token set. |
| 5 | Replace inline `hsl(var(--xxx))` in Select polyfill with `--md-sys-color-*` or Tailwind opacity classes | Old short-form CSS vars (`--on-surface`, `--primary`) are gone; only `--md-sys-color-*` exists at the CSS layer. |
| 6 | `Card` default variant changed from `elevated` → `filled` | Intentional per M3 Expressive. Existing `<Card>` without explicit variant will render as `surface-container-highest` (filled). No mass back-fill; the new default is correct. |
| 7 | `IconButton` moves from children → `icon` prop | Breaking API change confirmed against `IconButton.d.ts`. All callers must be updated. |
| 8 | `onPress` vs `onClick` on Button/IconButton | `onClick` still works (ButtonBase extends native `<button>` props). No forced migration; leave existing `onClick` in place and only switch to `onPress` in new code. |
| 9 | `TabList` + `TabContent` removed — content goes inside `Tab` | New React Stately-based `Tabs`. `selectedKey`/`onSelectionChange` replace `value`/`onValueChange`. |
| 10 | `MenuDivider` replaced by `MenuGroup` — each group is its own surface | New React Aria-based `Menu`. `MenuTrigger` wraps trigger + `Menu`. `onSelect` → `onAction`. |
| 11 | `Tooltip` wrapped in `TooltipTrigger` | New `Tooltip` is a pure overlay; `TooltipTrigger` provides hover/focus handling. |
| 12 | `Search` → `SearchBar` | Direct rename; same controlled props (`value`, `onChange`). |
| 13 | `PageBar` / `AppBar` → `TopAppBar` | Both old components removed. New `TopAppBar` takes `title`, `navigationIcon`, `actions` props instead of compound `AppBar.Headline`/`AppBar.Trailing`. |
| 14 | Upgrade `motion` to `^14.0.0` | Peer dep requirement from `@vkieu/mui`. App uses only stable `motion`, `AnimatePresence`, `Variants`, `Transition` — no API changes in v13→v14. |

---

## Step-by-Step Plan

- [ ] 1. **Upgrade `motion` to `^14.0.0`**
      In `apps/web/package.json`, change `"motion": "^12.0.0"` → `"motion": "^14.0.0"`.
      Run `pnpm install` from the workspace root.
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/package.json`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 2. **Update `globals.css`** (Step 2 from brief)
      Replace the three old imports with the two new ones.
      Update the dark mode CSS selector from `.dark ::-webkit-calendar-picker-indicator`
      to `[data-mode='dark'] ::-webkit-calendar-picker-indicator`
      (the new `ThemeProvider` sets `data-mode` not `.dark` class).
      **Before:**
      ```css
      @import "tailwindcss";
      @import "@vkieu/mui/theme.css";
      @import "@vkieu/mui/themes/theme-facebook.css";
      @source "../../node_modules/@vkieu/mui/src";
      ```
      **After:**
      ```css
      @import "tailwindcss";
      @import "@vkieu/mui/styles.css";
      @source "../../node_modules/@vkieu/mui/src";
      ```
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/app/globals.css`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 3. **Create `src/lib/snackbar.ts`** (prerequisite for Step 3)
      New file with `SnackbarContext = createContext<SnackbarHostState | null>(null)`
      and exported `useSnackbar()` hook that reads the context.
      ```tsx
      import { createContext, useContext } from "react";
      import { type SnackbarHostState } from "@vkieu/mui";
      export const SnackbarContext = createContext<SnackbarHostState | null>(null);
      export function useSnackbar(): SnackbarHostState {
        const ctx = useContext(SnackbarContext);
        if (!ctx) throw new Error("useSnackbar must be used within Providers");
        return ctx;
      }
      ```
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/lib/snackbar.ts`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 4. **Rewrite `src/app/providers.tsx`** (Step 3 — providers)
      Remove the manual `ThemeContext`, `ThemeProvider`, and `SnackbarProvider`.
      New structure:
      - `"use client"` directive
      - Import `ThemeProvider, SnackbarHost, useSnackbarHostState, createTheme` from `@vkieu/mui`
      - Import `QueryClient, QueryClientProvider` from `@tanstack/react-query` (unchanged)
      - Import `SnackbarContext` from `@/lib/snackbar`
      - Create the facebook theme: `const facebookTheme = createTheme({ name: 'facebook', seed: '#1877F2' })` (outside the component to avoid recreation)
      - In `Providers`, call `const snackbarState = useSnackbarHostState()`
      - Render:
        ```tsx
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            themes={['baseline', facebookTheme]}
            defaultTheme="facebook"
            storage="cookie"
          >
            <SnackbarContext.Provider value={snackbarState}>
              <SnackbarHost state={snackbarState} />
              {children}
            </SnackbarContext.Provider>
          </ThemeProvider>
        </QueryClientProvider>
        ```
      Note: `ThemeProvider` with `applyToDocument` (defaults to `true`) still writes
      `data-*` to `<html>` client-side. The SSR `themeAttributes` in `layout.tsx` (step 5)
      ensures no FOUC.
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/app/providers.tsx`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 5. **Update `src/app/layout.tsx`** (Step 3 — SSR theme)
      Make `RootLayout` async. Import `cookies` from `next/headers`,
      `NextRouterProvider, getThemeFromCookies, themeAttributes` from `@vkieu/mui/next`.
      Read theme state server-side and spread `themeAttributes` onto `<html>`.
      Wrap body content with `<NextRouterProvider>`.
      ```tsx
      import { cookies } from "next/headers";
      import { NextRouterProvider, getThemeFromCookies, themeAttributes } from "@vkieu/mui/next";
      export default async function RootLayout({ children }) {
        const theme = getThemeFromCookies(await cookies(), {
          themes: ['baseline', 'facebook'],
          defaults: { theme: 'facebook', mode: 'system' },
        });
        return (
          <html lang="en" suppressHydrationWarning {...themeAttributes(theme)}>
            <body className={roboto.className}>
              <NextRouterProvider>
                <Providers>{children}</Providers>
              </NextRouterProvider>
            </body>
          </html>
        );
      }
      ```
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/app/layout.tsx`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 6. **Delete `src/lib/theme.ts`**
      The file is no longer needed after `providers.tsx` no longer exports `ThemeContext`
      and all callers are updated in subsequent steps.
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/lib/theme.ts` (DELETE)
      Verify: `pnpm --filter @strata/web build` exits 0 after all callers are updated (steps 7+).

- [ ] 7. **Update `src/hooks/use-toast.ts`**
      Replace `useSnackbar` import from `@vkieu/mui` with `useSnackbar` from `@/lib/snackbar`.
      Update `snackbar.show(...)` → `snackbar.showSnackbar(...)`.
      Duration must be a string literal (`'short'` | `'long'` | `'indefinite'`), not a number.
      Map: `{ message, duration: 4000 }` → `{ message, duration: 'short' }`
      Map: `{ message, duration: 6000, priority: "urgent", showClose: true }` → `{ message, duration: 'long', withDismissAction: true }`
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/hooks/use-toast.ts`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 8. **Create `src/components/ui/icon.tsx`** (Step 4 — local polyfill)
      Port verbatim from `old-sources/icon.tsx`.
      Change only the `cn` import: `"./lib/utils"` → `"@/lib/utils"`.
      The component API is identical: `name`, `size`, `filled`, `weight`, `grade`, `opticalSize`, `className`.
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/components/ui/icon.tsx`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 9. **Create `src/components/ui/typography.tsx`** (Step 4 — local polyfill)
      Port from `old-sources/typography.tsx` with these changes:
      - Change imports: `"./lib/utils"` → `"@/lib/utils"`
      - Keep `cva` from `class-variance-authority` (still a dependency)
      - Keep `Slot` from `@radix-ui/react-slot` (still a dependency)
      - Update color class names to new token names:
        * `"surface-foreground"` class `"text-surface-foreground"` → `"text-on-surface"`
        * `"surface-variant-foreground"` class `"text-surface-variant-foreground"` → `"text-on-surface-variant"`
        * `"primary-container-foreground"` class `"text-primary-container-foreground"` → `"text-on-primary-container"`
        * `"secondary-container-foreground"` class `"text-secondary-container-foreground"` → `"text-on-secondary-container"`
        * `"tertiary-container-foreground"` class `"text-tertiary-container-foreground"` → `"text-on-tertiary-container"`
      - Keep `defaultVariants: { variant: "body-medium", color: "surface-foreground" }` but map value to new token
      Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/components/ui/typography.tsx`
      Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 10. **Create `src/components/ui/select.tsx`** (Step 4 — local polyfill)
       Port from `old-sources/select.tsx` with these changes:
       - Change imports: `"./lib/utils"` → `"@/lib/utils"`, `"./icon"` → `"@/components/ui/icon"`
       - Replace all `hsl(var(--xxx))` inline style patterns with Tailwind `--md-sys-color-*` variants:
         * `hsl(var(--on-surface)/0.08)` → use Tailwind class `bg-on-surface/8` (move from inline to class)
         * `hsl(var(--primary))` → `var(--md-sys-color-primary)` if kept inline, or use Tailwind class `text-primary`
         * `hsl(var(--error))` → `text-error` class
         * `hsl(var(--on-surface-variant))` → `text-on-surface-variant` class
         * `hsl(var(--outline))` → use `border-outline` class
         * `hsl(var(--elevation-2))` → remove or use `shadow-elevation-2` token class
       - The surface/container bg classes (`bg-surface-container`, `bg-surface-container-highest`, etc.) are unchanged.
       - Keep all component API props identical.
       Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/components/ui/select.tsx`
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 11. **Create `src/components/ui/card-content.tsx`** (Step 4 — local polyfill)
       Port `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
       from `old-sources/card.tsx` (the sub-components only — NOT the `Card` or `cardVariants`).
       Update class names:
         * `text-surface-foreground` → `text-on-surface`
         * `text-surface-variant-foreground` → `text-on-surface-variant`
       Change `cn` import from `"./lib/utils"` → `"@/lib/utils"`.
       Remove the `"use client"` directive (they are pure DOM wrappers) — or keep it for forward compat.
       Files: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/src/components/ui/card-content.tsx`
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 12. **Migrate ALL `@vkieu/mui/buttons` and `@vkieu/mui/navigation` imports** (Step 5 — subpath removal)
       These subpaths no longer exist in the new package exports.
       In every file listed below, merge the `/buttons` and `/navigation` imports into the main `@vkieu/mui` import statement.
       **32 files** (all files using `from "@vkieu/mui/buttons"` or `from "@vkieu/mui/navigation"`):
       ```
       src/app/(auth)/register/page.tsx
       src/app/(auth)/login/page.tsx
       src/app/(dashboard)/calendar/page.tsx
       src/app/(dashboard)/admin/settings/page.tsx
       src/app/(dashboard)/admin/org-structure/page.tsx
       src/app/(dashboard)/admin/features/page.tsx
       src/app/(dashboard)/admin/roles/page.tsx
       src/app/(dashboard)/admin/org-unit-types/page.tsx
       src/app/(dashboard)/admin/positions/page.tsx
       src/app/(dashboard)/dashboard/page.tsx
       src/app/(dashboard)/org-chart/page.tsx
       src/app/(dashboard)/people/page.tsx
       src/app/(dashboard)/finance/capacity/page.tsx
       src/app/(dashboard)/finance/rate-cards/page.tsx
       src/features/calendar/CalendarView.tsx
       src/features/calendar/components/EventForm.tsx
       src/features/calendar/components/LeaveBalancePanel.tsx
       src/features/calendar/components/FilterSelector.tsx
       src/features/calendar/components/ApprovalActions.tsx
       src/features/calendar/components/LeaveRequestForm.tsx
       src/components/assistant/assistant-panel.tsx
       src/components/ui/org-unit-tree-select.tsx
       src/components/flow-org/ExportButton.tsx
       src/components/flow-org/ReparentModal.tsx
       src/components/flow-org/FlowOrgHeader.tsx
       src/components/layout/header.tsx
       src/components/navigation/mobile-nav.tsx
       src/components/rate-cards/rate-card-set-dialog.tsx
       src/components/rate-cards/rate-card-group-dialog.tsx
       src/components/rate-cards/rate-card-dialog.tsx
       src/components/import/csv-import-dialog.tsx
       src/components/notifications/notification-dropdown.tsx
       ```
       Also in `src/components/assistant/assistant-panel.tsx`:
       `IconButton` is imported from `@vkieu/mui` directly — keep that.
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 13. **Replace removed/renamed top-level imports across all consumer files** (Step 5)
       For each file that imports a removed component, add the local polyfill import and remove the
       removed import from the `@vkieu/mui` import block.
       Full mapping:
       ```
       Icon              → @/components/ui/icon
       Typography        → @/components/ui/typography
       Select            → @/components/ui/select
       CardContent       → @/components/ui/card-content
       CardHeader        → @/components/ui/card-content
       CardTitle         → @/components/ui/card-content
       CardFooter        → @/components/ui/card-content
       CardDescription   → @/components/ui/card-content
       ```
       Renamed (stay in `@vkieu/mui`):
       ```
       AppBar / PageBar       → TopAppBar
       SnackbarProvider       → SnackbarHost (handled in providers.tsx already)
       Search                 → SearchBar
       Chip (variant="filter") → FilterChip
       Chip (variant="assist") → AssistChip
       Chip (variant="input")  → InputChip
       FAB                    → Fab
       ExtendedFAB            → ExtendedFab
       FABMenu                → FabMenu
       FABMenuItemComponent   → FabMenuItem
       CircularProgress       → CircularProgressIndicator
       LinearProgress         → LinearProgressIndicator
       TabList, TabContent    → removed (content moves inside Tab)
       DialogHeader           → removed (keep DialogTitle inline)
       DialogFooter           → DialogActions
       DialogDescription      → removed (use DialogContent for body text)
       MenuDivider            → removed (use MenuGroup for grouping)
       ```
       Also add `TooltipTrigger` import to any file using `Tooltip`.
       Also add `MenuTrigger` import to any file using `Menu`.
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 14. **Migrate `IconButton` from children → `icon` prop in all files** (Step 5)
       The new `IconButton` requires `icon: ReactElement` prop and does not accept `children`.
       Pattern: `<IconButton ...><Icon name="x" /></IconButton>` → `<IconButton icon={<Icon name="x" />} aria-label="..." .../>`.
       Import `Icon` from `@/components/ui/icon` in files that don't already import it.
       Files with `IconButton` using children pattern:
       ```
       src/app/(dashboard)/admin/org-structure/page.tsx
       src/app/(dashboard)/admin/roles/page.tsx
       src/app/(dashboard)/admin/org-unit-types/page.tsx
       src/app/(dashboard)/admin/positions/page.tsx
       src/features/calendar/CalendarView.tsx
       src/components/assistant/assistant-panel.tsx
       src/components/layout/header.tsx
       src/components/notifications/notification-dropdown.tsx
       src/app/(auth)/login/page.tsx   (show/hide password toggle)
       src/app/(auth)/register/page.tsx (show/hide password toggle)
       src/components/flow-org/FlowOrgHeader.tsx
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 15. **Migrate `Chip` → `AssistChip` / `FilterChip` / `InputChip`** (Step 5)
       Old `Chip` had `variant` prop. New chips are separate components.
       Rules:
       - `variant="filter"` → `FilterChip`; `selected` prop unchanged; add `onSelectedChange` for interactive chips
       - `variant="assist"` → `AssistChip`
       - `variant="input"` with `onDismiss` → `InputChip` with `onRemove`
       All `leadingIcon="name"` (string) → `leadingIcon={<Icon name="name" />}` (import `Icon` from `@/components/ui/icon`)
       `trailingIcon="name"` → `trailingIcon={<Icon name="name" />}`
       Files:
       ```
       src/app/(dashboard)/admin/settings/page.tsx
       src/app/(dashboard)/admin/org-structure/page.tsx
       src/app/(dashboard)/admin/features/page.tsx
       src/app/(dashboard)/admin/roles/page.tsx
       src/app/(dashboard)/admin/org-unit-types/page.tsx
       src/app/(dashboard)/admin/positions/page.tsx
       src/app/(dashboard)/dashboard/page.tsx
       src/app/(dashboard)/people/page.tsx
       src/app/(dashboard)/finance/capacity/page.tsx
       src/app/(dashboard)/finance/rate-cards/page.tsx
       src/app/(dashboard)/finance/budgets/page.tsx
       src/features/calendar/CalendarView.tsx
       src/features/calendar/components/LeaveBalancePanel.tsx
       src/components/flow-org/FlowOrgHeader.tsx
       src/components/import/csv-import-dialog.tsx
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 16. **Migrate `Tooltip` → `TooltipTrigger + Tooltip`** (Step 5)
       Old: `<Tooltip content="text" side="right"><element /></Tooltip>`
       New: `<TooltipTrigger placement="right"><element /><Tooltip>text</Tooltip></TooltipTrigger>`
       - The `content` prop is gone; tooltip text is now `Tooltip` children
       - The `side` prop moves to `placement` on `TooltipTrigger`
       - Import `TooltipTrigger` (add to existing `@vkieu/mui` import)
       Files:
       ```
       src/components/layout/sidebar.tsx     (2 tooltips)
       src/components/layout/header.tsx      (1 tooltip wrapping sidebar toggle)
       src/app/(dashboard)/admin/org-structure/page.tsx (6 tooltips)
       src/app/(dashboard)/admin/roles/page.tsx         (3 tooltips)
       src/app/(dashboard)/admin/org-unit-types/page.tsx (4 tooltips)
       src/app/(dashboard)/admin/positions/page.tsx      (3 tooltips)
       src/components/notifications/notification-dropdown.tsx (1 tooltip)
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 17. **Migrate `Menu` / `MenuItem` / `MenuDivider` → `MenuTrigger + Menu + MenuItem + MenuGroup`** (Step 5)
       Old: `<Menu trigger={<Button>} align="end"><MenuItem onSelect={handler} /></Menu>`
       New: `<MenuTrigger><Button /><Menu placement="bottom end"><MenuItem key="x" onAction={handler} /></Menu></MenuTrigger>`
       - Remove `trigger` prop → use `MenuTrigger` wrapper
       - `align` → `placement` on `Menu` (`"end"` → `"bottom end"`)
       - `onSelect` → `onAction` on `MenuItem`
       - `MenuDivider` → replace with `MenuGroup` wrapping a logical set of items
       - Each `MenuItem` needs a unique `key` prop
       Files:
       ```
       src/components/layout/header.tsx
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 18. **Migrate `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` / `DialogDescription`** (Step 5)
       Critical API change — old Radix-based Dialog vs. new React Aria-based Dialog:
       - Old `<Dialog open onOpenChange>` (root, no UI) → New `<Dialog open onOpenChange>` (is the modal panel)
       - Old `<DialogContent className="max-w-2xl">` (modal panel wrapper) → Move `className` to `<Dialog className="max-w-2xl">`. Remove `<DialogContent>` wrapper.
       - Old `<DialogHeader>` → Remove the wrapper element; keep `<DialogTitle>` directly.
       - Old `<DialogTitle>` → unchanged; stays as `<DialogTitle>`
       - Old `<DialogDescription>` → Remove the component; replace with `<DialogContent>` (new scrollable body) for body text, or a plain `<p>` element.
       - Old `<DialogFooter>` → Replace with `<DialogActions>`
       Migration pattern before → after:
       ```tsx
       // BEFORE
       <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Title</DialogTitle>
             <DialogDescription>Description</DialogDescription>
           </DialogHeader>
           {/* main content */}
           <DialogFooter>
             <Button>Cancel</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
       // AFTER
       <Dialog open={open} onOpenChange={setOpen} className="max-w-2xl">
         <DialogTitle>Title</DialogTitle>
         <DialogContent>
           <p>Description</p>
           {/* main content */}
         </DialogContent>
         <DialogActions>
           <Button onPress={() => setOpen(false)}>Cancel</Button>
         </DialogActions>
       </Dialog>
       ```
       Files (~12 files):
       ```
       src/components/flow-org/ReparentModal.tsx
       src/app/(dashboard)/admin/settings/page.tsx
       src/app/(dashboard)/admin/org-structure/page.tsx
       src/app/(dashboard)/admin/features/page.tsx
       src/app/(dashboard)/admin/roles/page.tsx
       src/app/(dashboard)/admin/org-unit-types/page.tsx
       src/app/(dashboard)/admin/positions/page.tsx
       src/app/(dashboard)/org-chart/page.tsx
       src/app/(dashboard)/people/page.tsx
       src/features/calendar/CalendarView.tsx
       src/components/rate-cards/rate-card-dialog.tsx
       src/components/rate-cards/rate-card-group-dialog.tsx
       src/components/rate-cards/rate-card-set-dialog.tsx
       src/components/import/csv-import-dialog.tsx
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 19. **Migrate `Tabs` / `TabList` / `Tab` / `TabContent`** (Step 5)
       Old: separate `TabList` and `TabContent` components; controlled via `value`/`onValueChange`.
       New: content lives inside `Tab` children; controlled via `selectedKey`/`onSelectionChange`.
       Migration:
       - `value={x}` → `selectedKey={x}`
       - `onValueChange={fn}` → `onSelectionChange={(key) => fn(key as string)}`
       - Remove `<TabList>` wrapper
       - `<Tab value="x" label="name" />` → `<Tab key="x" title="name">{tabContent}</Tab>`
       - Remove `<TabContent value="x">...</TabContent>`; that content is now inside the `<Tab>`
       Files:
       ```
       src/app/(dashboard)/finance/capacity/page.tsx   (tabs without content panels)
       src/app/(dashboard)/finance/rate-cards/page.tsx  (tabs with content panels)
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 20. **Migrate `PageBar` and `AppBar` → `TopAppBar`** (Step 5)
       Old compound pattern:
       ```tsx
       <AppBar className="...">
         <AppBar.Headline>title</AppBar.Headline>
         <AppBar.Trailing>actions</AppBar.Trailing>
       </AppBar>
       ```
       New props-based pattern:
       ```tsx
       <TopAppBar title="title" actions={<>…</>} className="..." />
       ```
       `PageBar` maps the same way.
       Files:
       ```
       src/components/layout/header.tsx          (AppBar)
       src/components/flow-org/FlowOrgHeader.tsx  (PageBar)
       src/app/(dashboard)/admin/settings/page.tsx (PageBar)
       src/app/(dashboard)/admin/org-structure/page.tsx (PageBar)
       src/app/(dashboard)/admin/features/page.tsx (PageBar)
       src/app/(dashboard)/admin/roles/page.tsx    (PageBar)
       src/app/(dashboard)/admin/org-unit-types/page.tsx (PageBar)
       src/app/(dashboard)/admin/positions/page.tsx (PageBar)
       src/app/(dashboard)/admin/page.tsx          (PageBar)
       src/app/(dashboard)/dashboard/page.tsx      (PageBar)
       src/app/(dashboard)/people/page.tsx         (PageBar)
       src/app/(dashboard)/finance/capacity/page.tsx (PageBar)
       src/app/(dashboard)/finance/rate-cards/page.tsx (PageBar)
       src/app/(dashboard)/finance/budgets/page.tsx  (PageBar)
       src/app/(dashboard)/finance/page.tsx          (PageBar)
       src/features/calendar/CalendarView.tsx        (PageBar)
       src/app/(dashboard)/org-chart/page.tsx        (no PageBar but has Icon/Typography)
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 21. **Migrate `Search` → `SearchBar`** (Step 5)
       Direct rename; `value`, `onChange`, `onSubmit`, `placeholder` props unchanged.
       Files:
       ```
       src/components/flow-org/FlowOrgHeader.tsx
       src/app/(dashboard)/admin/settings/page.tsx
       src/app/(dashboard)/admin/org-structure/page.tsx
       src/app/(dashboard)/admin/features/page.tsx
       src/app/(dashboard)/admin/roles/page.tsx
       src/app/(dashboard)/admin/org-unit-types/page.tsx
       src/app/(dashboard)/admin/positions/page.tsx
       src/app/(dashboard)/people/page.tsx
       src/components/ui/org-unit-tree-select.tsx
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 22. **Migrate `NavigationBar` in `mobile-nav.tsx`** (Step 5)
       The old API used `NavigationBar.Item` compound component with `value`/`onValueChange`.
       The new API uses separate `NavigationBarItem` with `selected` prop (no `value` system).
       ```tsx
       // BEFORE
       <NavigationBar value={activeValue} onValueChange={handleValueChange}>
         <NavigationBar.Item value="dashboard" icon="dashboard" label="Dashboard" />
       </NavigationBar>
       // AFTER
       <NavigationBar aria-label="Main navigation">
         <NavigationBarItem
           icon={<Icon name="dashboard" />}
           selected={activeValue === "dashboard"}
           onPress={() => handleValueChange("dashboard")}
         >
           Dashboard
         </NavigationBarItem>
       </NavigationBar>
       ```
       Import `NavigationBarItem` (already exported from `@vkieu/mui`).
       Import `Icon` from `@/components/ui/icon`.
       Files: `src/components/navigation/mobile-nav.tsx`
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 23. **Migrate `useTheme` from `@/lib/theme` → `@vkieu/mui` in `sidebar.tsx`** (Step 5)
       The new `useTheme` returns `{ theme, mode, resolvedMode, setTheme, setMode, setContrast, ... }`.
       Old `theme` (light/dark/system) maps to new `mode`.
       Old `setTheme` maps to new `setMode`.
       - Change import: `import { useTheme } from "@/lib/theme"` → `import { useTheme } from "@vkieu/mui"`
       - Change destructuring: `const { theme, setTheme }` → `const { mode, setMode }`
       - Change all `theme === "dark"` → `mode === "dark"`
       - Change `setTheme(...)` → `setMode(...)`
       - Migrate `Tooltip` (see step 16)
       - Migrate `Icon` import to local polyfill (step 13)
       Files: `src/components/layout/sidebar.tsx`
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 24. **Migrate `app/page.tsx` and remaining pages not yet covered** (Step 5)
       Files not covered by specific steps above that still import removed/renamed components:
       ```
       src/app/page.tsx                        — Icon, Typography, CardContent → local polyfills
       src/features/calendar/components/TeamAvailabilityBar.tsx — Typography → local polyfill
       src/components/flow-org/ContextMenu.tsx  — Icon, Typography → local polyfills
       src/components/flow-org/UnallocatedPanel.tsx — Icon, Typography → local polyfills
       src/components/flow-org/PersonNode.tsx   — Icon → local polyfill
       src/components/flow-org/OrgUnitNode.tsx  — Icon → local polyfill
       src/components/flow-org/GroupNode.tsx    — Icon → local polyfill
       src/components/flow-org/OrgUnitGroupNode.tsx — Icon → local polyfill
       src/components/flow-org/ExportButton.tsx  — Icon → local polyfill
       src/components/layout/breadcrumbs.tsx     — Icon → local polyfill
       src/components/import/sortable-org-level-item.tsx — Icon → local polyfill
       src/components/ui/icon-color-picker.tsx   — Icon → local polyfill
       src/components/ui/icon-picker.tsx         — Icon → local polyfill (TextField unchanged)
       src/components/ui/combo-box.tsx           — TextField unchanged (stays in @vkieu/mui)
       src/components/ui/color-picker.tsx        — TextField unchanged (stays in @vkieu/mui)
       src/app/(dashboard)/admin/page.tsx        — Icon, Typography, CardContent → local polyfills
       ```
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 25. **Update `Select` references to local polyfill** (Step 5)
       Files importing `Select` from `@vkieu/mui` (removed in new package):
       ```
       src/components/layout/header.tsx              — Select → @/components/ui/select
       src/app/(dashboard)/admin/settings/page.tsx   — Select → @/components/ui/select
       src/app/(dashboard)/admin/org-structure/page.tsx — Select → @/components/ui/select
       src/app/(dashboard)/admin/roles/page.tsx      — Select → @/components/ui/select
       src/app/(dashboard)/admin/positions/page.tsx  — Select → @/components/ui/select
       src/app/(dashboard)/people/page.tsx           — Select → @/components/ui/select
       src/app/(dashboard)/finance/capacity/page.tsx — Select → @/components/ui/select
       src/components/rate-cards/rate-card-group-dialog.tsx — Select → @/components/ui/select
       src/components/rate-cards/rate-card-dialog.tsx — Select → @/components/ui/select
       src/components/import/csv-import-dialog.tsx   — Select → @/components/ui/select
       ```
       The local `Select` has the identical API (`options`, `value`, `onValueChange`, `label`, `placeholder`,
       `variant`, `disabled`, `error`, `errorText`, `supportingText`, `required`, `searchable`, `className`).
       No JSX changes needed — only the import path changes.
       Verify: `pnpm --filter @strata/web build` exits 0.

- [ ] 26. **Final full build and type-check** (acceptance gate)
       Run `tsc --noEmit` and `pnpm --filter @strata/web build` from the workspace root.
       Fix any remaining type errors.
       Files: any files flagged by type-checker
       Verify: `cd /Users/xuan-manh.trinh/workplace/web/strata && tsc --noEmit -p apps/web/tsconfig.json && pnpm --filter @strata/web build`

- [ ] 27. **Update steering file** (Step 6)
       Update `/Users/xuan-manh.trinh/workplace/web/strata/.kiro/steering/development.md` to reflect:
       - New CSS import: `@vkieu/mui/styles.css`
       - New theme API: `ThemeProvider` + `createTheme` + `useTheme` from `@vkieu/mui`
       - Dark mode: `data-mode="dark"` attribute (set by `ThemeProvider`); `dark:` Tailwind classes respond to `[data-mode='dark']`
       - Component name updates: `TopAppBar`, `SnackbarHost`, `SearchBar`, `FilterChip`/`AssistChip`/`InputChip`, `Fab`, `LinearProgressIndicator`, `CircularProgressIndicator`, `FabMenu`/`FabMenuItem`
       - Local polyfill imports: `Icon` → `@/components/ui/icon`, `Typography` → `@/components/ui/typography`, `Select` → `@/components/ui/select`, `CardContent/CardHeader/CardTitle/CardFooter/CardDescription` → `@/components/ui/card-content`
       - Remove references to `@vkieu/mui/buttons` and `@vkieu/mui/navigation` subpaths
       - Remove references to `ThemeContext` from `@/lib/theme`
       - Remove references to old `SnackbarProvider`, `useSnackbar` — new pattern is `useSnackbar` from `@/lib/snackbar`
       - Remove `darkMode: "class"` from Tailwind dark mode description
       Files: `/Users/xuan-manh.trinh/workplace/web/strata/.kiro/steering/development.md`
       Verify: File updated with accurate descriptions.

---

## Known Differences / Broken or Missing

| Component / Feature | Status | Notes |
|---------------------|--------|-------|
| `Card` default variant | **Changed** | Old default `elevated` → new default `filled`. Intentional M3 Expressive change. |
| `Button.leadingIcon` / `Button.trailingIcon` | **Changed to ReactElement** | Already ReactElement in old sources (register/login pages already use JSX there). Only `Chip.leadingIcon` was a string. |
| `IconButton.icon` prop | **Breaking** | Was children, now required `icon: ReactElement` prop. All usages updated in step 14. |
| `NavigationBar.Item` compound | **Removed** | Now `NavigationBarItem` flat component with `selected` prop. Updated in step 22. |
| `AppBar.Headline`, `AppBar.Trailing` | **Removed** | Replaced by `title`, `actions` props on `TopAppBar`. |
| `BottomSheetHandle`, `BottomSheetHeader`, `BottomSheetContent`, `BottomSheetActions` | **Removed** | Not used in the app currently — no action needed. |
| `SideSheet` sub-components | **Removed** | Not used in app — no action needed. |
| `Toolbar` / `ToolbarLeading` / `ToolbarHeadline` / `ToolbarActions` | **Removed** | Not used in app — no action needed. |
| `SplitButtonLeading` | **Removed** | Not used in app — no action needed. |
| `DatePickerModal` | **Removed** | Not used in app — no action needed. |
| `duration`, `easing`, `spring`, `transition` from old motion lib | **Removed** | Not imported in app — no action needed. `@/lib/motion.ts` uses its own definitions. |
| `useNavigationBar`, `useNavigationRail` | **Removed** | Not used in app — no action needed. |
| `typographyVariants`, `ELEMENT_MAP` | **Removed** | The local polyfill re-exports them. No external callers. |
| CSS token classes `text-surface-foreground`, `text-surface-variant-foreground`, etc. | **Removed** | Updated in typography + card-content polyfills and their callers. Direct Tailwind class usage in app code (e.g., calendar.utils.ts `text-on-surface`) already uses new names. |
| `motion@12` → `motion@14` | **Peer dep** | Updated in step 1. App API usage unchanged. |
| `Chip` `className` pass-through | **Available** | All chip types accept `className`. |
| `Select` `SelectOption` type export | **Available from local** | The local `select.tsx` exports `SelectOption` type — callers that imported it from `@vkieu/mui` need to update import path (none found). |

---

## Acceptance Gate

All steps are considered complete when:
```bash
cd /Users/xuan-manh.trinh/workplace/web/strata
tsc --noEmit -p apps/web/tsconfig.json   # zero type errors
pnpm --filter @strata/web build           # exits 0
```
