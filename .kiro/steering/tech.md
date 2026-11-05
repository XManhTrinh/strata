---
inclusion: always
---

# Strata: technology

The stack decision, with the reasons, is in:

#[[file:docs/architecture/0001-tech-stack.md]]

## Stack

- **Next.js 16** (App Router), React 19, TypeScript strict, Node 24 LTS, pnpm 12. A single app, no
  monorepo tooling.
- **Supabase** is the whole backend: Postgres with RLS, SQL migrations, Auth, RPC (Postgres
  functions), `pg_cron`, Realtime (notifications), Storage (avatars,
  logos). `pgmq` is installed but unused; there are no Edge Functions yet.
- **UI:** `@windmorph/react` (Material Design 3 Expressive, built on React Aria) and
  `@windmorph/react-pro` (non-M3 components). Tailwind CSS v4 with Windmorph tokens, `cn()` from
  `@windmorph/react`, `motion` (`motion/react`), Material Symbols.
- **Libraries in use (logic only):** `react-aria-components` (table, virtualizer, drag and
  drop), `@tanstack/react-virtual`, `@internationalized/date`, `rrule`, `date-holidays`,
  `@xyflow/react` + `elkjs`, `zod`, `next-intl`, `papaparse` and `read-excel-file` (import, in
  the browser), `@react-email/render` + `nodemailer` (email over SMTP: Mailpit locally, Resend
  later), `@sentry/nextjs`.
- **Add when needed, not before:** `@tanstack/react-query` (a live, highly interactive screen),
  `react-hook-form` (a form too complex for Server Action + zod), `tailwind-variants`, `@visx`
  (charts), `exceljs` (Excel export, see the open decision in `status.md`).
- **Tests:** Vitest, Playwright, pgTAP (`supabase test db`). **CI:** GitHub Actions.
- **Hosting:** Vercel + Supabase Cloud, one EU region: Ireland (Supabase `eu-west-1`, Vercel `dub1`).

## Dependencies

- Add packages at their **latest stable version** (`pnpm add <pkg>`), never by copying versions
  from old code.
- Add a package only when it is used; `knip` in CI fails on unused dependencies, files and
  exports. Remove a package in the same change that stops using it.
- Renovate keeps dependencies current with grouped weekly pull requests.
- Deliberate exceptions:
  - **TypeScript stays on 6.x**, type checking included. TypeScript 7 (native) failed with
    "union type too complex" on next-intl's typed messages (756 keys, 2026-10-30) where 6.x passes,
    and typescript-eslint, Next.js and editors need the 6.x JavaScript API anyway. Move to 7 when
    it checks this code base cleanly and typescript-eslint supports it.
  - **`@types/node` follows the Node LTS major we run on** (Node 24), not newer types.
- Runtime: **Node 24 LTS** (`.nvmrc`; the newest line Vercel offers. Move .nvmrc, `engines` and `@types/node` to 26 together once Vercel supports it), **pnpm** pinned in `packageManager` (pnpm switches to it
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

| Layer          | Responsibility                                                                             |
| -------------- | ------------------------------------------------------------------------------------------ |
| Postgres       | Schema, RLS, permission functions, transactional RPCs, schedules, job queue                |
| Jobs           | `pg_cron` and batched SQL functions; email jobs call `/api/jobs/*` (no Edge Functions yet) |
| Next.js server | Reads with the user's session, Server Actions with zod, calendar feed, exports             |
| Browser        | Windmorph UI; import files parsed here; no client cache library yet                        |

Business logic lives in exactly one place (SQL **or** TypeScript), never duplicated.

## Local setup (managed Mac)

Never run package installs inside `/tmp`, `$TMPDIR` or any scratch folder, and never point a
package manager's home, store or cache there. Install only in the repo checkout or a worktree
under the user's workspace.

`@windmorph/react-pro` installs from the private `XManhTrinh/windmorph-pro` repository; Vercel and
CI need a read-only token for it.
