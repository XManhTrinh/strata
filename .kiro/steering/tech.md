---
inclusion: always
---

# Strata: technology

The stack decision, with the reasons, is in:

#[[file:docs/architecture/0001-tech-stack.md]]

## Stack

- **Next.js 16** (App Router), React 19, TypeScript strict, Node 26 LTS, pnpm 12. A single app, no
  monorepo tooling.
- **Supabase** is the whole backend: Postgres with RLS, SQL migrations, Auth, RPC (Postgres
  functions), `pg_cron`, `pgmq`, Edge Functions, Realtime, Storage.
- **UI:** `@windmorph/react` (Material Design 3 Expressive, built on React Aria) and
  `@windmorph/react-pro` (non-M3 components). Tailwind CSS v4 with Windmorph tokens, `cn()`
  (`clsx` + `tailwind-merge`), `tailwind-variants` for variants, `motion` (`motion/react`),
  Material Symbols.
- **Libraries (logic only):** `react-aria-components` (table, virtualizer, drag and drop),
  `@tanstack/react-virtual`, `@tanstack/react-query` (interactive screens only),
  `@internationalized/date`, `rrule`, `date-holidays`, `@xyflow/react` + `elkjs`, `@visx`,
  `react-hook-form` (complex forms only), `zod`, `next-intl`, `papaparse`, SheetJS, `exceljs`,
  Resend + React Email, Sentry.
- **Tests:** Vitest, Playwright, pgTAP (`supabase test db`). **CI:** GitHub Actions.
- **Hosting:** Vercel + Supabase Cloud, one EU region (Frankfurt).

## Dependencies

- Add packages at their **latest stable version** (`pnpm add <pkg>`), never by copying versions
  from old code.
- Add a package only when it is used; `knip` in CI fails on unused dependencies, files and
  exports. Remove a package in the same change that stops using it.
- Renovate keeps dependencies current with grouped weekly pull requests.
- Deliberate exceptions:
  - **TypeScript:** type checking (`pnpm typecheck`) uses **TypeScript 7** (`typescript-native`,
    the native compiler). The `typescript` package stays on **6.x** because typescript-eslint,
    Next.js and editors need its JavaScript API, which TypeScript 7 doesn't have yet. Remove the
    6.x copy once typescript-eslint supports 7.
  - **`@types/node` follows the Node LTS major we run on** (Node 26), not newer types.
- Runtime: **Node 26 LTS** (`.nvmrc`), **pnpm** pinned in `packageManager` (pnpm switches to it
  automatically).

## Never

- No NestJS, Prisma, Redis, BullMQ, Turborepo or a separate API service.
- No `@mui/*`, no other component library, no CSS-in-JS, no chart library with its own look,
  no `@dnd-kit` (use React Aria drag and drop).
- No schema changes outside `supabase/migrations`: no editing a hosted database by hand (Studio
  or SQL editor), and never run `supabase db push` from a laptop. Migrations reach staging and
  production only through the `deploy-db` workflow.
- Never use the Supabase service (secret) key for a user's request. It is only for jobs and
  admin tasks that cannot run as the user.
- Never trust the browser for permissions. The UI hides what the database already refuses.
- No `getSession()` for auth decisions on the server; verify with `getClaims()` (or `getUser()`).

## Where code runs

| Layer          | Responsibility                                                                 |
| -------------- | ------------------------------------------------------------------------------ |
| Postgres       | Schema, RLS, permission functions, transactional RPCs, schedules, job queue    |
| Edge Functions | Batch jobs (import, rate-card apply, GDPR export/erase, retention), email      |
| Next.js server | Reads with the user's session, Server Actions with zod, calendar feed, exports |
| Browser        | Windmorph UI; TanStack Query only for live, interactive screens                |

Business logic lives in exactly one place (SQL **or** TypeScript), never duplicated.

## Local setup (managed Mac)

Never run package installs inside `/tmp`, `$TMPDIR` or any scratch folder, and never point a
package manager's home, store or cache there. Install only in the repo checkout or a worktree
under the user's workspace.

`@windmorph/react-pro` installs from the private `XManhTrinh/windmorph-pro` repository; Vercel and
CI need a read-only token for it.
