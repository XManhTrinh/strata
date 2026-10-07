# @vkieu/mui — New Public API Surface

> Ground truth extracted from `packages/ui/src/*.ts` in github.com/XManhTrinh/mui (main branch, Oct 2025).
> Package version: `0.0.0` (pre-release from monorepo `packages/ui`)

---

## Package coordinates

| Item | Value |
|------|-------|
| Package ref in `package.json` | `"@vkieu/mui": "XManhTrinh/mui#path:packages/ui"` |
| Version | `0.0.0` |
| Built using | `tsdown` + Tailwind CSS v4 |
| Dist entry | `dist/index.js` / `dist/index.d.ts` |

---

## Package exports (from `package.json`)

```json
{
  ".":                      { "import": "./dist/index.js",              "types": "./dist/index.d.ts" },
  "./primitives":           { "import": "./dist/primitives.js",         "types": "./dist/primitives.d.ts" },
  "./next":                 { "import": "./dist/next.js",               "types": "./dist/next.d.ts" },
  "./vk":                   { "import": "./dist/vk.js",                 "types": "./dist/vk.d.ts" },
  "./styles.css":           "./dist/styles/styles.css",
  "./styles.compiled.css":  "./dist/styles.compiled.css",
  "./package.json":         "./package.json"
}
```

**Key changes from the old package:**
- Old: `"@vkieu/mui/theme.css"` → New: `"@vkieu/mui/styles.css"`
- Old: `"@vkieu/mui/themes/theme-blue.css"` etc → **removed** (themes are now JS-driven via `ThemeProvider`)
- New `./primitives` sub-path (React Aria primitives + shape library)
- New `./next` sub-path (Next.js helpers)
- New `./vk` sub-path (internal docs components: `CodeBlock`, `PropsTable`)

---

## CSS setup (replaces old `theme.css` import)

```css
/* globals.css */
@import 'tailwindcss';
@import '@vkieu/mui/styles.css';
```

For projects without Tailwind:
```css
@import '@vkieu/mui/styles.compiled.css';
```

---

## Theming API (replaces old static CSS theme files)

### ThemeProvider

```tsx
import { ThemeProvider } from '@vkieu/mui';

// Wrap your app root:
<ThemeProvider defaultTheme="baseline">{children}</ThemeProvider>
```

Exported from `"@vkieu/mui"`:

| Export | Type | Description |
|--------|------|-------------|
| `ThemeProvider` | Component | Root provider; sets up CSS variables via `<style>` injection |
| `ThemeProviderProps` | type | Props: `defaultTheme`, `defaultMode`, `defaultContrast`, `storageKey`, `nonce` |
| `ThemeScope` | Component | Scoped theming — override theme for a subtree |
| `ThemeScopeProps` | type | — |
| `ThemeScript` | Component | SSR script to avoid FOUC (put in `<head>`) |
| `ThemeScriptProps` | type | — |
| `getThemeScriptSource` | function | Returns the script string for manual injection |
| `useTheme` | hook | `{ theme, mode, contrast, setTheme, setMode, setContrast }` |
| `useThemeScope` | hook | Reads nearest scope's theme state |
| `ThemeContextValue` | type | — |
| `createTheme` | function | `createTheme({ seed: "#RRGGBB", variant })` → `ThemeDefinition` |
| `CreateThemeOptions` | type | `{ seed: string; variant: SchemeVariant }` |
| `ThemeDefinition` | type | — |

### Built-in themes

```ts
import { BUILT_IN_THEMES, BUILT_IN_THEME_NAMES, DEFAULT_THEME } from '@vkieu/mui';

// BUILT_IN_THEMES:
// { baseline, ocean, forest, sunset, rose, slate }

// DEFAULT_THEME: "baseline"
```

All built-in theme names: `"baseline" | "ocean" | "forest" | "sunset" | "rose" | "slate"`

> **Note:** Old themes (`blue`, `teal`, `green`, `red`, `amber`, `facebook`, `whatsapp`) are **gone**. New themes are generated at runtime from seed colors using Material Color Utilities.

### Color modes & contrast

```ts
// ColorMode: "light" | "dark" | "system"
// ContrastLevel: "standard" | "medium" | "high"
```

### CSS variable naming (new scheme)

Old: `--primary`, `--on-surface`, etc.  
New: `--md-sys-color-primary`, `--md-sys-color-on-surface`, etc.

Tailwind utility classes: `bg-primary`, `text-on-surface`, `bg-surface-container`, etc.  
(Mapped via `@theme` in the generated `tokens.css`.)

---

## Next.js helpers (`"@vkieu/mui/next"`)

```tsx
import { NextRouterProvider, getThemeFromCookies, themeAttributes } from '@vkieu/mui/next';
```

| Export | Description |
|--------|-------------|
| `NextRouterProvider` | Provides React Aria router context for Next.js `<Link>` |
| `NextRouterProviderProps` | — |
| `getThemeFromCookies` | Server-side: reads theme state from cookies for SSR |
| `CookieReader` | type |
| `GetThemeFromCookiesOptions` | type |
| `themeAttributes` | (re-exported from main) |
| `ThemeState` | (re-exported from main) |

---

## Main export — Components (from `"@vkieu/mui"`)

### Changed / renamed components

| Old component | New component | Notes |
|---------------|---------------|-------|
| `LinearProgress` | `LinearProgressIndicator` | Renamed |
| `CircularProgress` | `CircularProgressIndicator` | Renamed |
| `LoadingIndicator` | `LoadingIndicator` | Same name |
| `FAB` | `Fab` | Casing changed |
| `ExtendedFAB` | `ExtendedFab` | Casing changed |
| `FABMenu` / `FABMenuItemComponent` | `FabMenu` / `FabMenuItem` | Casing + rename |
| `NavigationBar` (+ `useNavigationBar`) | `NavigationBar` | Hook removed; React Aria-based |
| `NavigationRail` (+ `useNavigationRail`) | `NavigationRail` | Hook removed |
| `SnackbarProvider` / `useSnackbar` | `SnackbarHost` / `useSnackbarHostState` + `SnackbarHostState` | Redesigned |
| `AppBar` / `PageBar` | `TopAppBar` | Renamed, new variants |
| `AppBarLeading`, `AppBarHeadline`, `AppBarTrailing` | **removed** (slots via props/render props) |
| `BottomSheet` + `BottomSheetHandle/Header/Content/Actions` | `BottomSheet` (new API) + `SheetTrigger` |
| `SideSheet` + sub-components | `SideSheet` (new API) + `SheetTrigger` |
| `Toolbar`, `ToolbarLeading/Headline/Actions` | `DockedToolbar` / `FloatingToolbar` / `ToolbarFab` |
| `Select` | **removed** | No direct replacement (use `Menu` + `Button` pattern or implement via React Aria `Select`) |
| `Typography` | **removed** | Use Tailwind typography utilities directly |
| `Icon` | **removed** | Use `<span className="material-symbols-rounded">name</span>` directly |
| `Search`, `SearchView`, sub-components | `SearchBar` / `SearchAppBar` |
| `Carousel` | `Carousel` | API updated |
| `DatePicker` / `TimePicker` | `DatePicker` / `DateRangePicker` / `TimePicker` | API updated |
| `TextField` | `TextField` | Same name, new API |
| `Checkbox` | `Checkbox` | Same name |
| `Radio` / `RadioGroup` | `Radio` / `RadioGroup` | Same |
| `Switch` | `Switch` | Same |
| `Dialog` (Radix-based) | `Dialog` (React Aria-based) | API changed |
| `Menu`, `MenuItem`, `MenuHeader/Divider/Sub...` | `Menu`, `MenuItem`, `MenuGroup`, `MenuTrigger` | API changed |
| `List` / `ListItem` | `List` / `ListItem` | Same |
| `Divider` | `Divider` | Same |
| `Badge` | `Badge` + `BadgedBox` | `BadgedBox` wraps content |
| `Chip` | `AssistChip` / `FilterChip` / `InputChip` / `SuggestionChip` | Split into 4 variants |
| `Tabs`, `TabList`, `Tab`, `TabContent` | `Tabs` + `Tab` | Simplified; React Aria-based |
| `SplitButton` | `SplitButton` | Same, new API |
| `ButtonGroup` | `ButtonGroup` | Same |
| `Tooltip` | `Tooltip` + `TooltipTrigger` + `RichTooltip` + `RichTooltipTrigger` | Expanded |
| `Slider` | `Slider` + `RangeSlider` | Range variant added |

### Full component export list (from `src/index.ts`)

**Theming**
- `ThemeProvider`, `ThemeScope`, `ThemeScript`, `getThemeScriptSource`
- `useTheme`, `useThemeScope`
- `createTheme`
- `DEFAULT_STORAGE_KEY`, `DEFAULT_THEME_STATE`, `parseThemeState`, `serializeThemeState`, `themeAttributes`

**Tokens (re-exported)**
- `COLOR_ROLES`, `SCHEME_VARIANTS`, `BUILT_IN_THEMES`, `BUILT_IN_THEME_NAMES`, `DEFAULT_THEME`, `COLOR_MODES`, `CONTRAST_LEVELS` + all type exports
- Breakpoints, elevation, motion, shape, state, typography, z-index tokens

**Utilities**
- `cn` (tailwind-merge + clsx)
- `tv` (tailwind-variants wrapper)
- `getM3Spring`, `useM3Spring`

**Buttons**
- `Button`, `ButtonContext`, `buttonStyles`, `buttonVariantClasses`
- `IconButton`, `iconButtonStyles`
- `ButtonGroup`, `buttonGroupStyles`

**FAB**
- `Fab`, `ExtendedFab`, `fabStyles`, `extendedFabStyles`
- `FabMenu`, `FabMenuItem`, `fabMenuStyles`

**Progress**
- `LinearProgressIndicator`, `CircularProgressIndicator`, `LoadingIndicator`

**Tooltip**
- `Tooltip`, `TooltipTrigger`, `RichTooltip`, `RichTooltipTrigger`

**Snackbar**
- `Snackbar`, `SnackbarHost`, `useSnackbarHostState`, `SnackbarHostState`

**Navigation**
- `NavigationRail`, `NavigationRailItem`
- `NavigationBar`, `NavigationBarItem`

**Tabs**
- `Tabs`, `Tab`

**Chips**
- `AssistChip`, `FilterChip`, `InputChip`, `SuggestionChip`

**SplitButton**
- `SplitButton`

**Cards**
- `Card` (single component; no sub-components `CardHeader/Title/Description/Content/Footer`)

**TextField**
- `TextField`

**Form controls**
- `Checkbox`, `Radio`, `RadioGroup`, `Switch`

**Dialog**
- `Dialog`, `DialogTrigger`, `DialogActions`, `DialogContent`, `DialogTitle`

**Menu**
- `Menu`, `MenuTrigger`, `MenuItem`, `MenuGroup`

**Toolbar**
- `DockedToolbar`, `FloatingToolbar`, `ToolbarFab`

**Top App Bar**
- `TopAppBar`

**Search**
- `SearchBar`, `SearchAppBar`

**Divider**
- `Divider`

**Badge**
- `Badge`, `BadgedBox`

**List**
- `List`, `ListItem`

**Slider**
- `Slider`, `RangeSlider`

**Sheets**
- `BottomSheet`, `SideSheet`, `SheetTrigger`

**Carousel**
- `Carousel`

**Date / Time pickers**
- `DatePicker`, `DateRangePicker`, `PickerDialog`
- `TimePicker`

---

## Primitives sub-path (`"@vkieu/mui/primitives"`)

Intended for library extenders or custom components built on the same primitives:

- `useM3Interaction` — hover/focus/press state hook
- `Surface` — tonal surface container primitive
- `Overlay` — state-layer overlay
- `TouchTarget` — accessible touch/click target sizing
- `ButtonBase` — lowest-level button primitive (action / toggle / link variants)
- `CharacterCounter`, `ErrorText`, `FieldLabel`, `SupportingText` — form field parts
- `SelectionControl` — checkbox/radio base
- `TriggerContext` — disclosure context
- `usePresence` — mount/unmount animation hook
- `DomDirectionLocale` — RTL/LTR context
- `getMorph`, `morphPathAt`, `useM3Morph` — shape morphing
- Shape library: `CornerRounding`, `Cubic`, `MaterialShapes`, `Morph`, `RoundedPolygon`, `circle`, `pill`, `pillStar`, `rectangle`, `star`

---

## Peer dependencies (new)

| Package | Old requirement | New requirement |
|---------|----------------|-----------------|
| `react` | `>=18.0.0` | `^19.0.0` |
| `react-dom` | `>=18.0.0` | `^19.0.0` |
| `next` | `>=14.0.0` (optional) | `>=15.0.0` (optional) |
| `tailwindcss` | `>=4.0.0` | `^4.1.0` (now optional) |
| `motion` | `^13.x` (dep, not peer) | `^14.0.0` (peer) |

**New dependencies in the package itself:** `react-aria`, `react-stately`, `tailwind-variants`, `@internationalized/date`

**Removed from package deps:** `@radix-ui/*` (all), `class-variance-authority`

---

## CSS token path changes

| | Old | New |
|-|-----|-----|
| CSS import | `@vkieu/mui/theme.css` | `@vkieu/mui/styles.css` |
| CSS variable prefix | `--primary`, `--on-surface`, ... | `--md-sys-color-primary`, `--md-sys-color-on-surface`, ... |
| Dark mode | `.dark` class on `<html>` | `data-color-mode="dark"` attribute (set by `ThemeProvider`) |
| Generated CSS location | `src/styles/generated/tokens.css` etc | `dist/styles/generated/tokens.css` etc |
| Compiled (no Tailwind) | n/a | `@vkieu/mui/styles.compiled.css` |

---

## Removed exports (present in old, absent in new)

- `Icon` component — **removed**
- `Typography` component — **removed**
- `Select` component — **removed**
- `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` — **removed** (Card is now a single component)
- `duration`, `easing`, `spring`, `transition`, `SCALE_INITIAL` from `./lib/motion` — **removed** (replaced by `getM3Spring`, `useM3Spring`)
- All Radix-based primitive re-exports
- All theme preset CSS files (`/themes/theme-blue.css` etc)
- `typographyVariants`, `ELEMENT_MAP` — **removed** with Typography component
- `useNavigationBar`, `useNavigationRail` — **removed**
- `SnackbarProvider` / `useSnackbar` — **renamed** to `SnackbarHost` / `useSnackbarHostState`
- `AppBar`, `AppBarLeading`, `AppBarHeadline`, `AppBarTrailing`, `PageBar` — **removed**, replaced by `TopAppBar`
- `BottomSheetHandle`, `BottomSheetHeader`, `BottomSheetContent`, `BottomSheetActions` — **removed**
- `SideSheetHeader`, `SideSheetContent`, `SideSheetActions` — **removed**
- `ToolbarLeading`, `ToolbarHeadline`, `ToolbarActions` (old `Toolbar`) — **removed**
- `SearchLeadingIcon`, `SearchInput`, `SearchTrailingIcon`, `useSearch`, `SearchView*` — **removed**
- `FABMenuItemComponent` → renamed to `FabMenuItem`
- `SplitButtonLeading` — **removed**
- `NavigationBarItem` (old type shape) — new interface
- `DatePickerModal` — **removed** (replaced by `PickerDialog`)
- `DateRange` type — still exported but from `DatePicker`
- `TimeValue` type — check import

---

*Generated by the mui-upgrade install step. Paths verified against the actual source in the GitHub repo.*
