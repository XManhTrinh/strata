---
inclusion: auto
name: Tailwind CSS conventions
description: Tailwind v4 class usage rules for the strata web app
---

# Tailwind CSS Conventions

This project uses **Tailwind CSS v4** (`4.3.x`).

## Use canonical classes over arbitrary values

When a Tailwind utility class exists for a value, always use the canonical class instead of an arbitrary value bracket:

### Spacing & sizing (4px per unit)
- `min-w-50` not `min-w-[200px]`
- `min-w-80` not `min-w-[320px]`
- `max-w-120` not `max-w-[480px]`
- `max-h-80` not `max-h-[320px]`
- `w-35` not `w-[140px]`
- `h-14` not `h-[56px]`
- `gap-4` not `gap-[16px]`
- `p-6` not `p-[24px]`

### Font sizes with Tailwind equivalents
- `text-xs` = 12px (use `text-[12px]` only when paired with M3 leading/tracking specs)
- `text-sm` = 14px
- `text-base` = 16px

### When arbitrary values ARE acceptable
- Viewport-relative: `max-h-[60vh]`, `h-[calc(100vh-100px)]`
- M3 typography with specific leading/tracking: `text-[13px]`, `text-[11px]`, `text-[10px]`
- One-off design tokens with no spacing scale match
- Color opacity modifiers: `bg-surface-foreground/4`, `text-error/80`

## M3 typography
This project uses Material Design 3 type scale. Prefer M3 semantic classes (`text-body-medium`, `text-label-small`, `text-title-large`) where available. Use arbitrary pixel sizes only for compact UI elements (tables, chips, badges).


## Important modifier
Tailwind v4 uses the **suffix** `!` syntax for the important modifier:
- `shadow-md!` not `!shadow-md`
- `bg-surface!` not `!bg-surface`
- `[&>button]:bg-red!` not `[&>button]:!bg-red`
