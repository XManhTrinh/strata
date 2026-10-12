---
inclusion: auto
name: Strata development conventions
description: Core engineering rules for the Strata web app — component architecture, @vkieu/windmorph usage, styling, animation, code quality, and project structure
---

# Strata Development Conventions

You are a world-class engineer. Write **production-ready, clean, component-based code** that is reusable and importable across the app. No shortcuts, no TODOs, no placeholders.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| UI Library | `@vkieu/windmorph` — built on React Aria (+ Tailwind CSS v4 + Motion) implementing Material Design 3 Expressive — **primary component library** |
| Supplemental UI | `@strata/ui` (workspace shared package at `packages/ui/`) |
| Styling | Tailwind CSS v4+, `tailwind-merge`, `clsx` via `cn()` |
| Variants | `class-variance-authority` (CVA) when components need multi-axis variants |
| Animation | `motion` (framer-motion v12+) — import from `motion/react` |
| Icons | `material-symbols` (Material Symbols), `lucide-react` |
| State | `zustand` v5 (client stores), `@tanstack/react-query` v5 (server state) |
| Drag & Drop | `@dnd-kit` |
| Auth/DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Headless primitives | Radix UI (`@radix-ui/*`) when `@vkieu/windmorph` lacks a component |

## Import Alias

- `@/*` → `apps/web/src/*`
- `@strata/ui` → `packages/ui/src` (workspace dependency)

## Component Hierarchy — What to Use

1. **`@vkieu/windmorph`** — first choice for all standard UI: `Button`, `IconButton`, `Card`, `Dialog`, `TextField`, `Checkbox`, `AssistChip`, `FilterChip`, `InputChip`, `SuggestionChip`, `SearchBar`, `Divider`, `List`, `ListItem`, `Menu`, `MenuItem`, `Tooltip`, `Badge`, `NavigationRail`, `NavigationBar`, `Table`, `TopAppBar`, `SideSheet`, `SnackbarHost`, `LinearProgressIndicator`, `CircularProgressIndicator`, etc. The package exposes `.`, `/vk` (`Avatar`, `AvatarGroup`, `Skeleton`, `SkeletonGroup`), `/next`, `/primitives`, and `/rich-text`; subpaths like `@vkieu/windmorph/buttons` and `@vkieu/windmorph/navigation` still do not exist. Import standard UI from `@vkieu/windmorph`, and `Avatar`, `AvatarGroup`, `Skeleton`, `SkeletonGroup` from `@vkieu/windmorph/vk`.
2. **`@strata/ui`** — shared components that extend beyond MUI: `DataTable`, `SearchInput`, `StatCard`, `Badge`, `ProgressBar`, `Toast`, `EmptyState`, `Drawer`, `ConfirmDialog`.
3. **Radix UI** — headless primitives when `@vkieu/windmorph` doesn't cover the pattern (e.g., `Popover`, `DropdownMenu`, `Tabs`).
4. **Local `components/ui/`** — app-specific UI components that don't belong in the shared package. See **Local UI Polyfills** below.

**Never install `@mui/material` or any `@mui/*` package.** The project uses `@vkieu/windmorph` as its exclusive component library.

## Theming

- CSS tokens come from `@vkieu/windmorph/styles.css` — import it once in `globals.css`.
- Theming is managed by `ThemeProvider` from `@vkieu/windmorph` in `providers.tsx`, using the default built-in `baseline` theme (no custom `createTheme` override).
- Dark mode is driven by the `data-mode="dark"` attribute set by `ThemeProvider`. The `dark:` Tailwind prefix responds to `[data-mode='dark']` as configured in `@vkieu/windmorph/styles.css` utilities — **not** via `darkMode: "class"`.
- Use `useTheme()` from `@vkieu/windmorph` (not `@/lib/theme`) to read/set theme and mode. The hook returns `{ theme, mode, resolvedMode, setTheme, setMode, setContrast, ... }`.
- Use semantic Tailwind token classes: `bg-card`, `text-foreground`, `bg-surface-variant`, `text-on-surface`, `text-on-surface-variant`, `text-on-primary-container`, `border-border`, `bg-secondary`, `ring-background`, `ring-ring`, `p-card`.
- **Do NOT use `ThemeContext` from `@/lib/theme`.** **Do NOT use `darkMode: "class"` in Tailwind config.** **Do NOT introduce shadcn/ui theming or CSS-in-JS.**

## Local UI Polyfills

These components were removed from `@vkieu/windmorph` and are provided as local polyfills that match M3 token class names:

| Component(s) | Import from |
|---|---|
| `Icon` | `@/components/ui/icon` |
| `CardContent`, `CardHeader`, `CardTitle`, `CardFooter`, `CardDescription` | `@/components/ui/card-content` |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | `@/components/ui/table` |

`Select` (with `SelectItem`) and `Autocomplete` (with `AutocompleteItem`) now come from `@vkieu/windmorph` — the local `select` and `combo-box` polyfills were removed.

**Type is utility classes, not a component.** There is no `Typography` component — the `@/components/ui/typography` polyfill was deleted. Apply M3 type with `text-{role}` utility classes on semantic HTML tags (see `apps/web/.agents/design/redesign-system.md` §1); choose the tag for document semantics and the `text-{role}` class for the visual size independently.

All polyfills use the same M3 CSS variable token names as the new `@vkieu/windmorph` CSS variables.

## Snackbar

- Snackbar state is managed via `useSnackbar()` from `@/lib/snackbar` — **not** from `@vkieu/windmorph`.
- Show a snackbar by calling `snackbar.showSnackbar({ message, duration: 'short' | 'long' | 'indefinite', withDismissAction: boolean })`.
- `SnackbarHost` (from `@vkieu/windmorph`) is rendered once in `providers.tsx`.
- For simple toast-style notifications use the convenience wrapper `useToast()` from `@/hooks/use-toast`.



### Structure
- Add `"use client"` directive at the top for any component with state, effects, event handlers, or browser APIs.
- Export a named `Props` interface alongside the component (e.g., `export interface StatCardProps { ... }`).
- Use `React.forwardRef` for primitive wrapper components that accept `ref`.
- Always spread `...props` and accept `className` for composability.
- Use `cn()` (`import { cn } from "@/lib/utils"`) to merge classes — never string concatenation.

### Variants
- For simple size/variant maps: use plain `const` objects (e.g., `const sizeClasses = { s: "...", m: "...", l: "..." } as const`).
- For complex multi-axis variants: use CVA (`cva` from `class-variance-authority`).
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
- Use `sonner` (via `@strata/ui` Toast) for toast notifications — never `window.alert`.

## Data Fetching

- Use `@tanstack/react-query` for server state (queries, mutations, cache).
- API calls go in `services/` — never inline `fetch` in components.
- Use `zustand` for client-only state (UI state, local preferences).

## What NOT to Do

- Do NOT use `@mui/material`, `@emotion/*`, or `styled-components`.
- Do NOT introduce shadcn/ui theming (`components.json`, `tailwind.config` theme tokens) — theme tokens come from `@vkieu/windmorph`.
- Do NOT use `React.FC` — use plain function components with explicit return types when needed.
- Do NOT use default exports.
- Do NOT hardcode colors — use semantic token classes.
- Do NOT skip `"use client"` on interactive components.
- Do NOT use `!important` in Tailwind (the `!` suffix) unless overriding third-party styles.
- Do NOT import from `@vkieu/windmorph/buttons` or `@vkieu/windmorph/navigation` — these subpaths no longer exist; import everything from `@vkieu/windmorph`.
- Do NOT use `ThemeContext` from `@/lib/theme` — use `useTheme()` from `@vkieu/windmorph` instead.
- Do NOT use `SnackbarProvider` or `useSnackbar` from `@vkieu/windmorph` — use `SnackbarHost` + `useSnackbar()` from `@/lib/snackbar`.
- Do NOT import `Avatar`, `AvatarGroup`, `Skeleton`, or `SkeletonGroup` from `@/components/ui/avatar` or `@/components/ui/skeleton` — those polyfills have been deleted; import from `@vkieu/windmorph/vk` instead.
- Do NOT import `Avatar` or `Skeleton` from `@strata/ui` in the web app — go directly to `@vkieu/windmorph/vk`. The `@strata/ui` re-exports exist for other packages that depend on it.
- Do NOT import or use a `Typography` component — there is none. `@/components/ui/typography` was deleted; apply M3 type with `text-{role}` utility classes on semantic tags (see `apps/web/.agents/design/redesign-system.md` §1).
