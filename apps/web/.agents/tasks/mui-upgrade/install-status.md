# @vkieu/mui Upgrade — Install Status

## 1. package.json change applied

File: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/package.json`

| Before | After |
|--------|-------|
| `"@vkieu/mui": "github:XManhTrinh/mui"` | `"@vkieu/mui": "XManhTrinh/mui#path:packages/ui"` |

The package moved from the root of the `XManhTrinh/mui` repo to the `packages/ui` subdirectory of a monorepo.

---

## 2. pnpm install result

**Status: ✅ Succeeded**

Command: `pnpm install` from workspace root `/Users/xuan-manh.trinh/workplace/web/strata`

Warnings (non-blocking):
- `unmet peer motion@^14.0.0: found 12.43.0` — the workspace has `motion@12.x`; the new package requires `motion@^14.0.0`. This peer mismatch needs to be resolved when updating component code.
- `Failed to create bin vkieu-mui` — the CLI bin (`dist/cli.js`) was not pre-built in the GitHub source; resolved below.

---

## 3. CSS token generation

The new package ships only a compiled `dist/` (source and scripts are gitignored/excluded by `"files": ["dist","NOTICE"]` in package.json). Since the upstream repo does not pre-build `dist/`, pnpm installed only `NOTICE`, `README.md`, and `package.json`.

**Resolution:** The repo was sparse-cloned, devDependencies installed, and the package was fully built:

```
# In a sparse clone of XManhTrinh/mui:
cd packages/ui
npx tsx scripts/generate.ts      # → src/styles/generated/{tokens,themes,theme}.css
npx tsx scripts/build-css.ts     # → dist/styles/ + dist/styles.compiled.css
node_modules/.bin/tsdown          # → dist/{index,next,primitives,vk,...}.js
```

The built `dist/` was then copied to the pnpm store package location.

### Generated CSS files — ✅ All three exist

| File | Absolute path | Size |
|------|--------------|------|
| `tokens.css` | `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/node_modules/@vkieu/mui/dist/styles/generated/tokens.css` | 20 KB |
| `themes.css` | `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/node_modules/@vkieu/mui/dist/styles/generated/themes.css` | 118 KB |
| `theme.css`  | `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/node_modules/@vkieu/mui/dist/styles/generated/theme.css` | 17 KB |

> **Note on path change:** The task instructions referenced `src/styles/generated/*.css` — that path is correct relative to the *build source*, but the installed package ships only `dist/`. The equivalent files in the installed package live under `dist/styles/generated/`.

---

## 4. Old sources saved

Directory: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/.agents/tasks/mui-upgrade/old-sources/`

| File | Description |
|------|-------------|
| `icon.tsx` | Old `Icon` component source |
| `typography.tsx` | Old `Typography` component source |
| `select.tsx` | Old `Select` (Exposed Dropdown Menu) component source |
| `card.tsx` | Old `Card` + all sub-components (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) |
| `index.ts` | Old barrel file (full export list) |
| `package.json` | Old package.json |
| `theme.css` | Old `theme.css` (CSS tokens + animation utilities) |
| `themes-index.ts` | Old `src/themes/index.ts` (theme presets list) |

---

## 5. New API surface

File: `/Users/xuan-manh.trinh/workplace/web/strata/apps/web/.agents/tasks/mui-upgrade/new-api-surface.md`

Key highlights for downstream migration steps:
- CSS import: `@import '@vkieu/mui/styles.css'` (was `@vkieu/mui/theme.css`)
- Theming: `<ThemeProvider defaultTheme="baseline">` (was static CSS file selection)
- Built-in themes: `baseline | ocean | forest | sunset | rose | slate` (old: `blue | teal | green | red | amber | facebook | whatsapp | purple`)
- CSS variables: `--md-sys-color-primary` scheme (was `--primary`)
- Framework: React Aria (was Radix UI)
- **Removed:** `Icon`, `Typography`, `Select` components; all Card sub-components; all old navigation hooks
- **Renamed:** `FAB→Fab`, `LinearProgress→LinearProgressIndicator`, `AppBar→TopAppBar`, etc.
- **peer dep:** `motion@^14.0.0` required (workspace currently has `12.x`)

---

## Summary

| Step | Status |
|------|--------|
| package.json updated | ✅ |
| pnpm install | ✅ (peer warning: motion@12 vs ^14 required) |
| CSS tokens generated | ✅ (via build from source) |
| dist deployed to pnpm store | ✅ |
| Old sources captured | ✅ |
| New API surface documented | ✅ |
