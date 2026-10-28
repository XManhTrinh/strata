---
inclusion: auto
name: Strata development conventions
description: Core engineering rules for the Strata web app — component architecture, Windmorph (@windmorph/react, @windmorph/react-pro) usage, styling, animation, code quality, and project structure
---

# Strata Development Conventions

You are a world-class engineer. Write **production-ready, clean, component-based code** that is reusable and importable across the app. No shortcuts, no TODOs, no placeholders.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| UI Library | `@windmorph/react` — built on React Aria (+ Tailwind CSS v4 + Motion) implementing Material Design 3 Expressive — **primary component library** |
| Pro components | `@windmorph/react-pro` — components outside the M3 spec (`Avatar`, `AvatarGroup`, `Skeleton`, `SkeletonGroup` …), installed from the private `windmorph-pro` repo's `dist` branch |
| Supplemental UI | `@strata/ui` (workspace shared package at `packages/ui/`) |
| Styling | Tailwind CSS v4+, `tailwind-merge`, `clsx` via `cn()` |
| Animation | `motion` (framer-motion v12+) — import from `motion/react` |
| Icons | `material-symbols` (Material Symbols) |
| State | `zustand` v5 (client stores), `@tanstack/react-query` v5 (server state) |
| Drag & Drop | `@dnd-kit` |
| Auth/DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Headless primitives | React Aria (through Windmorph) when Windmorph lacks a component |

## Import Alias

- `@/*` → `apps/web/src/*`
- `@strata/ui` → `packages/ui/src` (workspace dependency)

## Component Hierarchy — What to Use

1. **`@windmorph/react`** — first choice for all standard UI: `Button`, `IconButton`, `Card`, `Dialog`, `TextField`, `Checkbox`, `AssistChip`, `FilterChip`, `InputChip`, `SuggestionChip`, `SearchBar`, `Divider`, `List`, `ListItem`, `Menu`, `MenuItem`, `Tooltip`, `Badge`, `NavigationRail`, `NavigationBar`, `Table`, `TopAppBar`, `SideSheet`, `SnackbarHost`, `LinearProgressIndicator`, `CircularProgressIndicator`, etc. The core exposes `.`, `/next` and `/primitives`. Import standard UI from `@windmorph/react`, and `Avatar`, `AvatarGroup`, `Skeleton`, `SkeletonGroup` (and the other non-M3 components) from `@windmorph/react-pro` (rich text is `@windmorph/react-pro/rich-text`).
2. **`@strata/ui`** — shared components that extend beyond MUI: `DataTable`, `SearchInput`, `StatCard`, `Badge`, `ProgressBar`, `Toast`, `EmptyState`, `Drawer`, `ConfirmDialog`.
3. **React Aria** — hooks or components from `react-aria` / `react-aria-components` when Windmorph doesn't cover the pattern. Don't add Radix UI or another component library.
4. **Local `components/ui/`** — app-specific UI components that don't belong in the shared package. See **Local UI Polyfills** below.

**Never install `@mui/material` or any `@mui/*` package.** The project uses `@windmorph/react` (`@windmorph/react` and `@windmorph/react-pro`) as its exclusive component library.

## Theming

- CSS tokens come from `@windmorph/react/styles.css`, then `@windmorph/react-pro/styles.css` (in that order), with an `@source` line for each package — imported once in `globals.css`.
- Theming is managed by `ThemeProvider` from `@windmorph/react` in `providers.tsx`, using only the built-in `baseline` theme: `STRATA_THEMES` in `@/lib/theme-config` is passed to both `getThemeFromCookies` (layout) and `ThemeProvider` (no custom `createTheme`).
- Dark mode is driven by the `data-mode="dark"` attribute set by `ThemeProvider`. The `dark:` Tailwind prefix responds to `[data-mode='dark']` as configured in `@windmorph/react/styles.css` utilities — **not** via `darkMode: "class"`.
- Use `useTheme()` from `@windmorph/react` (not `@/lib/theme`) to read/set theme and mode. The hook returns `{ theme, mode, resolvedMode, setTheme, setMode, setContrast, ... }`.
- Use semantic Tailwind token classes: `bg-card`, `text-foreground`, `bg-surface-variant`, `text-on-surface`, `text-on-surface-variant`, `text-on-primary-container`, `border-border`, `bg-secondary`, `ring-background`, `ring-ring`, `p-card`.
- **Do NOT use `ThemeContext` from `@/lib/theme`.** **Do NOT use `darkMode: "class"` in Tailwind config.** **Do NOT introduce shadcn/ui theming or CSS-in-JS.**

## Local UI Polyfills

These components were removed from `@windmorph/react` and are provided as local polyfills that match M3 token class names:

| Component(s) | Import from |
|---|---|
| `Icon` | `@/components/ui/icon` |
| `CardContent`, `CardHeader`, `CardTitle`, `CardFooter`, `CardDescription` | `@/components/ui/card-content` |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | `@/components/ui/table` |

`Select` (with `SelectItem`) and `Autocomplete` (with `AutocompleteItem`) now come from `@windmorph/react` — the local `select` and `combo-box` polyfills were removed.

**Type is utility classes, not a component.** There is no `Typography` component — the `@/components/ui/typography` polyfill was deleted. Apply M3 type with `text-{role}` utility classes on semantic HTML tags (see `apps/web/.agents/design/redesign-system.md` §1); choose the tag for document semantics and the `text-{role}` class for the visual size independently.

All polyfills use the same M3 CSS variable token names as the new `@windmorph/react` CSS variables.

## Snackbar

- Snackbar state is managed via `useSnackbar()` from `@/lib/snackbar` — **not** from `@windmorph/react`.
- Show a snackbar by calling `snackbar.showSnackbar({ message, duration: 'short' | 'long' | 'indefinite', withDismissAction: boolean })`.
- `SnackbarHost` (from `@windmorph/react`) is rendered once in `providers.tsx`.
- For simple toast-style notifications use the convenience wrapper `useToast()` from `@/hooks/use-toast`.



### Structure
- Add `"use client"` directive at the top for any component with state, effects, event handlers, or browser APIs.
- Export a named `Props` interface alongside the component (e.g., `export interface StatCardProps { ... }`).
- Use `React.forwardRef` for primitive wrapper components that accept `ref`.
- Always spread `...props` and accept `className` for composability.
- Use `cn()` (`import { cn } from "@/lib/utils"`) to merge classes — never string concatenation.

### Variants
- For simple size/variant maps: use plain `const` objects (e.g., `const sizeClasses = { s: "...", m: "...", l: "..." } as const`).
- For complex multi-axis variants: use the Windmorph component's own `variant` / `size` props, or a typed `const` map per axis.
- Export variant types so consumers can type-check variant props.

### File Naming
- Components: `kebab-case.tsx` (e.g., `stat-card.tsx`, `avatar-group.tsx`).
- Hooks: `use-<name>.ts` (e.g., `use-theme.ts`).
- Utils: `kebab-case.ts`.
- Types: `types.ts` or `<feature>.types.ts`.

### Exports
- Use named exports, not default exports.
- Re-export from `index.ts` barrel files for shared packages.
- Co-export types: `export type { StatCardProps } from "./stat-card"`.

## Animation

- Import from `motion/react` (not `framer-motion`).
- Reuse shared variants and transitions from `@/lib/motion.ts` (`dialogOverlayVariants`, `dialogContentVariants`, `pageTransitionVariants`, `dropdownVariants`, `sheetVariants`, `defaultTransition`, `springTransition`).
- Add new shared variants to `@/lib/motion.ts` when they'll be used in 2+ places.
- Always respect reduced motion: use `resolveAnimationVariants()` from `@/lib/motion.ts` or `useReducedMotion()` from motion.
- Keep animation subtle and functional — M3-style motion durations (150–300ms), spring for interactive, ease-out for entrances.

## Project Organization

### Shared reusable components → `packages/ui/src/`
Components used across multiple features or apps belong here. Export from `packages/ui/src/index.ts`.

### App-level shared components → `apps/web/src/components/`
```
components/
├── ui/           # Primitives (avatar, skeleton, color-picker)
├── layout/       # Dashboard shell, header, breadcrumbs
├── navigation/   # Nav rail + flyout, drawer nav, compact top bar, bottom bar, nav model
├── auth/         # Auth-related components
└── <domain>/     # Domain-specific shared components
```

### Feature modules → `apps/web/src/features/<feature>/`
Group by feature when a feature has its own components, hooks, types, and utils:
```
features/<feature>/
├── <FeatureView>.tsx      # Main entry component (PascalCase)
├── components/            # Feature-specific components
├── hooks/                 # Feature-specific hooks
├── types/                 # Feature-specific types
└── utils/                 # Feature-specific utilities
```

### Services → `apps/web/src/services/`
API service functions for data fetching, organized by domain.

### Hooks → `apps/web/src/hooks/`
App-wide custom hooks shared across features.

## Code Quality

- TypeScript strict mode. No `any` — use proper types, generics, or `unknown`.
- No inline magic numbers — extract to named constants or variant maps.
- Every component must be accessibility-compliant: semantic HTML, proper ARIA attributes, keyboard navigation, focus management.
- Error boundaries and loading states for async UI.
- Memoize expensive computations with `useMemo`/`useCallback` only when there's a measurable performance need — don't pre-optimize.
- Keep components under ~200 lines. Extract sub-components or hooks when exceeding this.
- Use `useSnackbar()` from `@/lib/snackbar` for notifications — never `window.alert`.

## Data Fetching

- Use `@tanstack/react-query` for server state (queries, mutations, cache).
- API calls go in `services/` — never inline `fetch` in components.
- Use `zustand` for client-only state (UI state, local preferences).

## What NOT to Do

- Do NOT use `@mui/material`, `@emotion/*`, or `styled-components`.
- Do NOT introduce shadcn/ui theming (`components.json`, `tailwind.config` theme tokens) — theme tokens come from `@windmorph/react`.
- Do NOT use `React.FC` — use plain function components with explicit return types when needed.
- Do NOT use default exports.
- Do NOT hardcode colors — use semantic token classes.
- Do NOT skip `"use client"` on interactive components.
- Do NOT use `!important` in Tailwind (the `!` suffix) unless overriding third-party styles.
- Do NOT import from `@vkieu/windmorph` or `@vkieu/mui` — the package is `@windmorph/react` (with `@windmorph/react-pro` for the non-M3 components).
- Do NOT use `ThemeContext` from `@/lib/theme` — use `useTheme()` from `@windmorph/react` instead.
- Do NOT use `SnackbarProvider` or `useSnackbar` from `@windmorph/react` — use `SnackbarHost` + `useSnackbar()` from `@/lib/snackbar`.
- Do NOT import `Avatar`, `AvatarGroup`, `Skeleton`, or `SkeletonGroup` from `@/components/ui/avatar` or `@/components/ui/skeleton` — those polyfills have been deleted; import from `@windmorph/react-pro` instead.
- Do NOT import `Avatar` or `Skeleton` from `@strata/ui` in the web app — go directly to `@windmorph/react-pro`. The `@strata/ui` re-exports exist for other packages that depend on it.
- Do NOT import or use a `Typography` component — there is none. `@/components/ui/typography` was deleted; apply M3 type with `text-{role}` utility classes on semantic tags (see `apps/web/.agents/design/redesign-system.md` §1).
