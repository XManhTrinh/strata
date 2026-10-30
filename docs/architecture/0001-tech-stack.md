# ADR 0001: Tech stack for the Strata rewrite

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

The current stack (Next.js + NestJS + Prisma + Redis + BullMQ worker in a Turborepo) came from the
Kiro spec `.kiro/specs/strata-platform/design.md`, generated in one commit (`df30f16`, 2026-08-04)
against up-front requirements (thousands of concurrent users, audit trail, reports) that were later
dropped. Supabase was added on 2026-09-06 for Auth and Realtime only, on top of the existing backend.

The audit found:

- Two identity spaces (Supabase `auth.users` UUID vs Prisma `User.id` cuid) that break RBAC for
  everyone except super admins and break the leave workflow.
- Most API endpoints check authentication but not company membership or permissions.
- Prisma migrations stopped matching the schema; `prisma db push` is used, and the API container
  reseeds demo accounts on every start.
- The BullMQ worker has no producers; Redis only holds caches and import progress.
- `@strata/validation`, `utils`, `config` are unused; `shared-types` and `ui` are near-unused.
- The web app is a client-side SPA with UI permissions taken from a `localStorage` role switcher.

Fixed constraints from the product owner: **Next.js**, **Supabase** as the backend, and
**`@windmorph/react` + `@windmorph/react-pro`** as the component library, following
**Material Design 3** guidelines.

## Decision

### Application

| Concern             | Choice                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | Next.js 16 App Router, React 19, TypeScript strict                                                                                                      |
| Runtime and tooling | Node 24 LTS (newest on Vercel), pnpm 12 (pinned in `packageManager`), TypeScript 7 for type checking with TypeScript 6 kept for tools that need its API |
| Repo shape          | A single Next.js app with `supabase/` alongside it. No Turborepo, no internal packages. (Revisit only if a second app appears.)                         |
| Reads               | React Server Components using the server Supabase client                                                                                                |
| Writes              | Server Actions (or route handlers where an HTTP endpoint is needed)                                                                                     |
| Client server-state | TanStack Query, only for highly interactive screens (capacity grid, live lists)                                                                         |
| Client UI state     | React state and context; no state library unless a real need appears                                                                                    |
| Dependencies        | Latest stable versions at scaffold time; only what is used (`knip` in CI); Renovate for weekly updates                                                  |
| Validation          | zod, one schema per form/action, shared by the form and the Server Action (see Forms below)                                                             |
| Session             | `@supabase/ssr` in `proxy.ts`, verifying the token server-side (`getClaims()` / `getUser()`, never `getSession()` for auth decisions)                   |

### Backend: Supabase

| Concern                   | Choice                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database                  | Supabase Postgres; schema owned by SQL migrations in `supabase/migrations`                                                                                                                          |
| Types                     | `supabase gen types typescript`, committed and regenerated in CI                                                                                                                                    |
| Identity                  | Supabase Auth (email + Google). `auth.users.id` (UUID) is the only user ID; a `profiles` table keyed by it replaces `User`/`Person`                                                                 |
| Authorization             | RLS on every table: company membership checks plus SQL helper functions (`is_member`, `is_super_admin`, `has_permission(company, feature, permission)`, scope checks over a recursive org-unit CTE) |
| Multi-step business logic | Postgres functions (RPC), one transaction each: leave submit/approve/reject/cancel, rate-card apply, org-unit move, set manager, company reset                                                      |
| Scheduled jobs            | `pg_cron` (leave accrual, year-end carry-over)                                                                                                                                                      |
| Long-running jobs         | Edge Function (CSV import), progress written to a table and pushed via Realtime                                                                                                                     |
| Realtime                  | Notifications and import progress                                                                                                                                                                   |
| Files                     | Supabase Storage (CSV uploads)                                                                                                                                                                      |
| Server-only secrets       | AI assistant runs in a Next.js route handler or Edge Function, querying with the caller's JWT so RLS applies                                                                                        |

### UI

| Concern              | Choice                                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Components           | `@windmorph/react` first, `@windmorph/react-pro` for non-M3 components; no other component library, no `@mui/*`                                                                                                                                                |
| Design guidelines    | Material Design 3: canonical layouts (list-detail, supporting pane), window size classes, M3 type roles, color tokens only                                                                                                                                     |
| Styling              | Tailwind CSS v4 with Windmorph tokens, `cn()` (`clsx` + `tailwind-merge`)                                                                                                                                                                                      |
| Motion               | `motion` (`motion/react`), respecting reduced motion                                                                                                                                                                                                           |
| Icons                | Material Symbols                                                                                                                                                                                                                                               |
| Data table           | Own `DataTable` with a full API on the `react-aria-components` Table and its virtualizer, styled with Windmorph tokens (Windmorph has no table). No TanStack Table                                                                                             |
| Data grid            | Own `DataGrid` (spreadsheet editing) with a custom keyboard model and TanStack Virtual; AG Grid Community, themed with Windmorph tokens, only as a fallback if performance targets are missed                                                                  |
| Component variants   | `tailwind-variants` (as Windmorph does)                                                                                                                                                                                                                        |
| Org chart            | `@xyflow/react` drawing Windmorph components; **ELK (`elkjs`)** for layout of both the reporting chart and the grouped hierarchy view, loaded only on those pages and run in a web worker. Large organizations are expanded on demand, never drawn all at once |
| Drag and drop        | `react-aria-components` drag and drop (keyboard and screen-reader accessible); replaces `@dnd-kit`                                                                                                                                                             |
| Dates and time zones | `@internationalized/date` (as Windmorph's pickers do)                                                                                                                                                                                                          |
| Recurring events     | `rrule` (RFC 5545, the format Google and Outlook use)                                                                                                                                                                                                          |
| Public holidays      | `date-holidays`, loaded into the holiday tables by a scheduled job                                                                                                                                                                                             |
| Charts               | `@visx` primitives styled with Windmorph tokens; no chart library with its own look                                                                                                                                                                            |
| Forms                | Simple forms: Server Action + zod. Complex forms: `react-hook-form` with one Windmorph adapter per input type, submitting to a Server Action. The same zod schema validates in the browser and on the server                                                   |
| Translation          | `next-intl`                                                                                                                                                                                                                                                    |
| Import files         | `papaparse` (CSV, streaming) and SheetJS (Excel)                                                                                                                                                                                                               |
| Excel export         | `exceljs`                                                                                                                                                                                                                                                      |
| Email                | Resend + React Email                                                                                                                                                                                                                                           |
| Error monitoring     | Sentry with EU data storage                                                                                                                                                                                                                                    |

Every library above is used for logic only; everything visible is a Windmorph component or styled
with Windmorph tokens. No other component library, CSS-in-JS, or chart library with its own look.

Gaps in Windmorph that must be built: data table/grid, tree select, calendar month grid,
colour/icon picker, breadcrumbs. They are built in Strata first (`src/components/ui`, with a full
API and no Strata imports), then moved to windmorph-pro.

Windmorph issues found while building, to fix upstream:

- `Autocomplete` with `selectionMode="multiple"`: text left in the input after a pick clears the
  whole selection on blur. Strata clears the input on each pick (`role-units-dialog.tsx`).
- `IconButton` defaults to `filled`; Material 3 uses standard icon buttons for menus, back arrows
  and row actions, so Strata passes `variant="standard"` everywhere.

### Quality and delivery

| Concern        | Choice                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit tests     | Vitest (rate-card engine, capacity maths, leave rules, CSV mapping)                                                                                                                                                                                                            |
| Database tests | pgTAP via `supabase test db` (RLS policies and RPCs)                                                                                                                                                                                                                           |
| End-to-end     | Playwright                                                                                                                                                                                                                                                                     |
| CI             | GitHub Actions: lint, typecheck, unit, db tests against local Supabase, e2e smoke, type-gen drift check                                                                                                                                                                        |
| Hosting        | Vercel (web) + Supabase Cloud, both in one EU region, Ireland (Supabase `eu-west-1`, Vercel `dub1`); Vercel serves static content globally, server code runs next to the database. Each workspace records its data region so dedicated regional deployments can be added later |
| Environments   | Supabase local for dev; separate Supabase projects for preview/staging and production                                                                                                                                                                                          |

## Removed

NestJS API, Prisma, Redis, BullMQ worker, Turborepo, `packages/*`, Render (`render.yaml`),
`Dockerfile.api`, `Dockerfile.worker`, `docker-compose.yml`, bcrypt, jose, custom API keys,
the `localStorage` role switcher, and the Kiro platform/auth specs as sources of truth.

## Carried over (re-implemented, with tests)

- Domain model, fixed (see the audit): single user ID, foreign keys on every user reference,
  manager per company rather than global, deprecated fields dropped.
- Rate-card engine: priority order, first match wins, ANDed conditions, 7 operators,
  monthly cost = quarter day rate × working days, snapshot on apply.
- Capacity: 12 FTE periods per membership × org unit × fiscal year, subtree roll-up, cost from the
  applied rate-card snapshot.
- Leave: status machine, Mon–Fri working days, balance formula, overlap rejection, auto-approve,
  accrual cap, carry-over cap, recurrence rules.
- CSV import mapping: org path to unit tree, grade to career level, position creation and range
  widening, multi-squad FTE split, line-manager matching.
- Permission scopes: own, direct reports, org unit, branch, company.
- Admin invariants: no cycles in org tree or reporting lines, last super admin keeps a role,
  system roles immutable, `authorization` feature cannot be disabled.

## Consequences

- One deployable app and one backend, with authorization enforced in the database.
- Business logic moves partly into SQL; it needs pgTAP tests and careful review.
- The current code is reference material only; nothing is migrated file by file.
- Open product questions (tenancy, v1 scope, data migration, permission scopes, repo location,
  where Windmorph gaps are built, AI assistant, leave rules) shape the schema and are decided
  before the first migration is written.
