---
inclusion: auto
name: Tailwind CSS conventions
description: Tailwind v4 class usage rules for the strata web app
---

# Tailwind CSS Conventions

This project uses **Tailwind CSS v4** (`4.3.x`).

## Use canonical classes over arbitrary values

When a Tailwind utility class exists for a value, always use the canonical class instead of an arbitrary value bracket. The `tailwindcss(suggestCanonicalClasses)` lint warning should never appear in generated code.

### Spacing & sizing (4px per unit)
Any pixel value divisible by 4 has a canonical class — always use it:
- `min-w-50` not `min-w-[200px]`
- `min-w-80` not `min-w-[320px]`
- `max-w-120` not `max-w-[480px]`
- `max-h-80` not `max-h-[320px]`
- `w-35` not `w-[140px]`
- `h-14` not `h-[56px]`
- `h-21` not `h-[84px]`
- `min-h-21` not `min-h-[84px]`
- `gap-4` not `gap-[16px]`
- `p-6` not `p-[24px]`
- `pl-6` not `pl-[24px]`

### Rounding values to the 4px grid
When a design spec gives a non-grid value, round to the nearest 4px grid point and use the canonical class:
- `85px` → use `h-21` (84px) or `h-[85px]` only if the exact pixel matters for alignment
- `52px` → use `h-13`
- `200px` → use `w-50`

### Font sizes with Tailwind equivalents
- `text-xs` = 12px, `text-sm` = 14px, `text-base` = 16px — for non-type-scale UI sizing only.
- For M3 standard type roles use `text-{role}` (see redesign-system.md §1), never a hand-rolled `text-[Npx]`.

### When arbitrary values ARE acceptable
- Viewport-relative: `max-h-[60vh]`, `h-[calc(100vh-100px)]`
- Non-type-scale micro sizes only (e.g. a dense control's label that is deliberately off-scale): `text-[13px]`, `text-[11px]`, `text-[10px]`. **Standard roles always use `text-{role}` per `apps/web/.agents/design/redesign-system.md` §1 — do not hand-roll M3 sizes with `text-[Npx]`.**
- One-off design tokens with no spacing scale match
- Color opacity modifiers: `bg-on-surface/4`, `text-error/80`

## M3 typography
This project uses Material Design 3 type scale.

### Typography = type-scale utility classes, no component
Apply M3 type with `text-{role}` utilities on **semantic HTML tags** (see `apps/web/.agents/design/redesign-system.md` §1). **There is no `Typography` component — never import `@/components/ui/typography`.** The class name mirrors the role exactly (`headline-medium` → `text-headline-medium`); pick the tag for document semantics (heading level, `p`, `span`) independently of the visual size.

```tsx
// ✅ Standalone text — semantic tag + text-{role}
<h1 className="text-headline-medium">Page Title</h1>
<p className="text-body-medium text-on-surface-variant">Description</p>
<span className="text-label-large">Badge text</span>
<h5 className="text-title-large truncate">Long title…</h5>

// ❌ Never — hand-rolled M3 sizes on raw elements
<h1 className="text-[28px] leading-9 font-normal">Page Title</h1>
```

### When raw text is acceptable (no `text-{role}` wrapper)
- **Inside MUI compounds** — `ListItem` children, `DialogTitle`, `CardTitle`, `Chip` labels already render with M3 typography. Don't double-wrap.
- **Table cells** — `<td>` content where an extra wrapper per cell adds DOM overhead with no visual benefit.
- **Inline fragments** — A `<span>` for inline emphasis inside an existing text block.
- **Form labels** — `<label htmlFor="...">` paired with checkboxes/inputs.

### M3 type scale quick reference
| Role (class `text-{role}`) | Size | Weight | Use case |
|---------|------|--------|----------|
| `display-large` | 57px | 400 | Hero / splash |
| `display-medium` | 45px | 400 | Marketing headers |
| `display-small` | 36px | 400 | Large section titles |
| `headline-large` | 32px | 400 | Page titles (wide) |
| `headline-medium` | 28px | 400 | Page titles |
| `headline-small` | 24px | 400 | Section titles |
| `title-large` | 22px | 400 | Card / dialog titles |
| `title-medium` | 16px | 500 | Sub-section titles |
| `title-small` | 14px | 500 | Small titles / labels |
| `body-large` | 16px | 400 | Primary body text |
| `body-medium` | 14px | 400 | Default body text |
| `body-small` | 12px | 400 | Supporting text |
| `label-large` | 14px | 500 | Button labels, prominent labels |
| `label-medium` | 12px | 500 | Chip labels, tab labels |
| `label-small` | 11px | 500 | Badges, overlines |


## Important modifier
Tailwind v4 uses the **suffix** `!` syntax for the important modifier:
- `shadow-md!` not `!shadow-md`
- `bg-surface!` not `!bg-surface`
- `[&>button]:bg-red!` not `[&>button]:!bg-red`
