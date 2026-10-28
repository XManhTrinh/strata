# Strata rebuild plan

Built from `architecture/0001-tech-stack.md` (the stack) and `product-decisions.md` (what the
product does). Where this plan and those documents disagree, those documents win and this plan is
corrected.

The rebuild happens on the `rebuild` branch. `main` is reference material only: business rules
are ported from it and re-tested; no file is copied across.

---

## 1. Architecture

### 1.1 Responsibilities

| Layer | Does | Does not |
|---|---|---|
| **Postgres (Supabase)** | Owns the schema, enforces tenancy and permissions with RLS, runs multi-step changes as transactional functions (RPC), runs schedules (`pg_cron`), queues jobs (`pgmq`) | Render anything; call external services |
| **Edge Functions** | Long-running or batch jobs: people import, rate-card apply, retention runs, email sending | Hold business rules that must also run elsewhere |
| **Next.js server** (Server Components, Server Actions, route handlers) | Reads with the user's session, validates input with zod, calls RPCs, serves the calendar feed and file exports | Bypass RLS (the service key is never used for user requests) |
| **Browser** | Interactive UI with Windmorph; TanStack Query only for live, highly interactive screens | Decide permissions (it only hides what the server already refuses) |

Rules that apply everywhere:

- **One user ID:** `auth.users.id`. Everything else refers to it, or to a workspace member.
- **Every tenant table has `workspace_id`**, UUID primary keys, and no uniqueness rule that spans
  workspaces. This keeps workspace merges possible (decision 1).
- **Every write goes through RLS or an RPC that checks permissions itself.** Nothing trusts the
  browser.
- **Pure business logic lives in one place**, either SQL or TypeScript, never both. TypeScript
  engines (e.g. rate cards) run on the server and write results through RPCs.

### 1.2 Jobs

One generic `jobs` table (type, workspace, status, progress, result, errors) and a `pgmq` queue.
An Edge Function picks up jobs, works in batches, and writes progress; the UI follows progress
through Realtime. Used by people import, rate-card apply, GDPR export and erasure, and retention
runs.

### 1.3 Request flow

```
Browser ── Server Component ── supabase (user session) ── Postgres + RLS
        └─ Server Action ── zod ── RPC (transaction, permission checks) ── Postgres
        └─ Realtime ──────────────────────────────────── notifications, job progress
proxy.ts refreshes the session and verifies it (getClaims) on every request
```

### 1.4 Repository layout

```
strata/
├── src/
│   ├── app/
│   │   ├── (marketing)/              landing, pricing (later), legal pages
│   │   ├── (auth)/                   sign-in, sign-up, reset, auth/callback, auth/confirm
│   │   ├── onboarding/               create workspace from a template, accept invite
│   │   ├── w/[workspace]/            everything inside a workspace (by slug)
│   │   │   ├── layout.tsx            shell: navigation, top app bar, workspace switcher
│   │   │   ├── page.tsx              dashboard for the user's role
│   │   │   ├── people/ org-chart/ hierarchy/
│   │   │   ├── calendar/ time-off/ approvals/
│   │   │   ├── planning/             scenarios, capacity grid, planned roles
│   │   │   ├── rate-cards/
│   │   │   └── settings/             general, members, roles, features, fields, time types,
│   │   │                             schedules, holidays, import, retention, audit log
│   │   └── api/                      calendar feed, exports, webhooks
│   ├── features/<module>/            components, actions.ts, queries.ts, schemas.ts, types.ts
│   ├── components/
│   │   ├── shell/                    adaptive navigation, page header, workspace switcher
│   │   └── ui/                       components Windmorph lacks (data table, tree select, ...)
│   ├── lib/                          supabase clients, auth, i18n, permissions, formatting, motion
│   └── messages/en.json              all UI text
├── supabase/
│   ├── migrations/                   the only source of the schema
│   ├── functions/                    Edge Functions (jobs worker, email)
│   ├── tests/                        pgTAP tests for RLS and RPCs
│   └── seed.sql                      demo workspaces (personal, team, company)
├── e2e/                              Playwright
└── docs/
```

Module code stays under `features/<module>`; pages in `app/` stay thin (load data, render the
feature). The ~200-line component limit from the old steering doc stays.

---

## 2. Database design

Names are snake_case. Every tenant table has `id uuid`, `workspace_id`, `created_at`,
`updated_at`. Money columns always have a `currency` next to them (decision 14). Dates that depend
on a person's location are stored as dates in that person's time zone.

### 2.1 Platform and workspaces

| Table | Purpose |
|---|---|
| `profiles` | One per `auth.users` row: name, avatar, locale, time zone. Created by a trigger on sign-up |
| `workspaces` | Name, slug, kind (personal/team/company), template, **data region**, currency, fiscal year start month, default country, time zone, week start, planning settings, subscription plan |
| `subscription_plans`, `subscription_plan_features` | Plans and the features each allows (only "Free" at launch) |
| `features`, `feature_dependencies`, `permissions` | Seeded by migration: each feature, what it needs, and its actions |
| `workspace_features` | Which allowed features the workspace has on |
| `members` | A person in a workspace. `user_id` is null until they accept an invite (imported people often never sign in). Person key, name, email, country, time zone, status (active/invited/inactive), is_owner |
| `invitations` | Email, role, optional member to link, token, expiry |
| `roles`, `role_permissions` | Role = set of (permission, reach). Reach: own, reports, team, team_and_below, units, workspace |
| `member_roles`, `member_role_units` | Who has which role; the units for "specific units" reach |
| `audit_log` | Actor, action, table, row, before/after, time. Written by triggers on sensitive tables |
| `notifications`, `notification_preferences` | In-app list; per-category email choice and daily summary |
| `jobs` | See 1.2 |

Platform staff access (decision 5) is a separate `platform_admins` table checked by its own
functions, never a customer role.

### 2.2 Organization and people

| Table | Purpose |
|---|---|
| `org_unit_levels` | Workspace-defined levels (e.g. Division, Cluster, Tribe, Squad), ordered, with icon and colour |
| `org_units` | Tree with `parent_id` and an `ltree` path for fast subtree queries; archived, not deleted |
| `positions`, `career_level_schemes`, `career_levels` | Positions with a min/max level; the workspace's levelling scheme |
| `employment_types` | Workspace-defined options, each with a **cost method** (annual salary / day rate) |
| `custom_fields`, `custom_field_options` | Type, visibility, required, keep-history, import key |
| `member_assignments` | **Effective-dated** (`valid_from`, `valid_to`): org unit, manager, position, career level, employment type, work schedule, holiday calendar |
| `member_compensation` | **Effective-dated** salary and day rate with currency. Its own strict RLS |
| `member_field_values` | Custom field values; effective-dated for fields with keep-history |
| `reporting_closure`, `org_unit_closure` | Precomputed "who is under whom" for the **current** date, maintained by triggers and a nightly job that applies future-dated changes; history queries use recursive SQL instead |
| `import_mappings` | Saved column mapping per workspace |
| `table_views` | Saved columns and filters per table; personal or shared |

Reporting cycles and org-tree cycles are refused by triggers. The "as of date" view of the
organization is one SQL function (`org_as_of(workspace, date)`) used by the org chart, people
list and reports.

### 2.3 Time: calendar, time types and leave

| Table | Purpose |
|---|---|
| `work_schedules` | Working days (and later hours) per week; workspace default plus per person via `member_assignments` |
| `holiday_calendars`, `holidays` | Per country/region, loaded from a maintained holiday data source by a scheduled job, editable per workspace |
| `time_types` | The settings in decision 10: allowance, approval, away, visibility, paid, who can book, book for others, approver rule |
| `allowance_policies` | Per time type: yearly amount, accrual (upfront or monthly), carry-over cap, expiry; country templates seed them |
| `allowance_ledger` | Every balance change as a row: grant, accrual, adjustment, usage, carry-over, expiry. **Balance = sum of rows**, so every number can be explained |
| `bookings` | Time type, start and end (date + optional half day, or time for events), time zone, recurrence rule, title, notes, status, working days counted |
| `booking_attendees` | Who a booking is for (one person, or a team for team events) |
| `booking_approvals` | Approval steps: approver, decision, comment, time. One step in v1; the table allows chains |
| `calendar_feed_tokens` | Secret links for the one-way calendar feed |

Booking, approving, rejecting, cancelling and adjusting are RPCs: each checks the rules (overlap,
allowance, who may approve), writes the booking, the approval and the ledger rows in one
transaction, and queues the notification. Accrual, carry-over and expiry run from `pg_cron`.

Working days for a booking = days in the person's schedule, minus holidays in their calendar,
with half days counting 0.5. This is one SQL function, tested against country examples.

### 2.4 Planning: scenarios, capacity and rate cards

| Table | Purpose |
|---|---|
| `scenarios` | Fiscal year(s), name, baseline it was copied from, status (draft/submitted/approved), is_live, locked-through period |
| `planned_roles` | Vacancy: title, org unit, position, employment type, start/end, FTE, filled by (member) |
| `allocations` | Scenario, member **or** planned role, org unit, period start, FTE. One row per period (no `p1…p12` columns) |
| `rate_card_sets`, `rate_card_groups` | UI-only organization (tabs and groups) |
| `rate_cards` | Priority, is default, conditions (on any built-in or custom field) |
| `rate_card_rates` | **Dated** per period: day rate, working days, currency |
| `cost_snapshots` | Result of "apply": per scenario, member or planned role, period, rate card used, monthly cost |

The rate-card engine (priority order, first match wins, ANDed conditions, seven operators,
monthly cost = day rate × working days) is a pure TypeScript module with full unit tests. "Apply"
is a job that runs the engine and writes `cost_snapshots` in batches. Capacity totals are SQL
views over allocations × snapshots, rolled up through `org_unit_closure`, splittable by any custom
field.

### 2.5 Permissions in the database

SQL functions, all `stable`, `security definer`, fixed `search_path`:

- `current_member(workspace)`: the caller's member row.
- `feature_on(workspace, feature)`: allowed by the plan **and** switched on.
- `reach(workspace, permission)`: the widest reach the caller holds for that permission.
- `can(workspace, permission, target_member)`: checks the reach against the target using the
  closure tables and `member_role_units`.

RLS policies on every table combine these. Examples:

- `members` select: `feature_on(ws,'people') and can(ws,'people.view', id)`.
- `member_compensation` select: `can(ws,'people.view_compensation', member_id)`.
- `bookings` select: the booking's time-type visibility, then `can(ws,'time.view', member)`.

Every policy has pgTAP tests that sign in as an owner, an HR role with "specific units", a line
manager, a team lead, a member, and a stranger from another workspace, and check what each can
see and change.

### 2.6 Performance target

Designed and tested for a workspace with **100,000 members**, 5 levels of org units, and 10 years
of bookings:

- Indexes on every `workspace_id` + lookup column; `(select auth.uid())` in policies so it is
  evaluated once per query.
- Reach checks hit closure tables and indexes, never a recursive walk per row.
- Lists are paginated server-side; tables virtualize rows.
- A seed generator creates a 100k-member workspace for load tests in CI (nightly).

---

## 3. Screens

Material 3 layouts and Windmorph components first; "build" marks components Strata builds in
`components/ui` (decision 8). Per-device behaviour follows decision 17.

| Area | Screen | Layout | Main components |
|---|---|---|---|
| Shell | Navigation | Bottom bar (phone), rail (tablet), expanded rail (desktop); one top app bar per page | `NavigationBar`, `NavigationRail`, `TopAppBar`, `Menu` (workspace switcher) |
| Auth | Sign in, sign up, reset, invite accept | Single centered pane | `TextField`, `Button`, `Card` |
| Onboarding | Create workspace (template picker) | Stepper in one pane | `Card`, `RadioGroup`, `Button` |
| Dashboard | Role dashboard | Card grid | `Card`, `LinearProgressIndicator`, `List` |
| People | Directory and profile | **List-detail** (tablet/desktop), list then detail (phone); table view on desktop | `ListDetailLayout`, `SearchBar`, `List`, `Avatar`, `Tabs`, data table (build) |
| People | History and future changes | Timeline inside profile | `List`, `DatePicker`, `Dialog` |
| Org chart | Chart and person view | Full canvas (tablet/desktop), person view (phone) | `@xyflow/react` + ELK layout, `Avatar`, `Card`, `SideSheet` |
| Hierarchy | Units and levels | List-detail with tree | tree view (build), `Dialog`, `FabMenu` |
| Calendar | Month, week, list | Full-width grid; list on phone | calendar grid (build), `ButtonGroup` (view switch), `DatePicker` |
| Time off | Book, my balances, my requests | Supporting pane (balances beside the form) | `Dialog`/full-screen dialog on phone, `DateRangePicker`, `Select` |
| Approvals | Pending requests | List-detail | `List`, `Button`, `Snackbar` |
| Planning | Scenarios, capacity grid, planned roles | Full-width grid (desktop edit, otherwise read-only) | data table (build, virtualized), `Tabs`, `SideSheet`, `Menu` |
| Rate cards | Sets, groups, cards | List-detail | `Tabs`, `List`, `Dialog`, condition builder (build) |
| Settings | All settings pages | List-detail (sections left, form right) | `List`, `TextField`, `Switch`, `Select`, colour/icon picker (build) |
| Import | Upload, map, preview, apply | Stepper; desktop/tablet only | `FileTrigger`, data table (build), `LinearProgressIndicator` |
| Shared | Empty, loading, error, "open on a larger screen" | — | `EmptyState`, `Skeleton`, `LoadingIndicator` |

Every route has `loading.tsx` and `error.tsx`. Forms use one pattern: zod schema, Server Action,
field errors on the inputs, `Snackbar` for success.

---

## 4. Build phases

Each phase ends with something usable, deployed to staging, with tests green. A module is
**done** when its migrations, RLS tests, RPC tests, unit tests, screens (all three window sizes),
end-to-end happy path, audit logging and English strings are complete.

### Phase 0: Foundation

1. Clean the branch: remove `apps/`, `packages/`, Docker, Render and Turborepo files; gitignore
   `next-env.d.ts`.
2. New Next.js 16 app at the repo root with Windmorph, Tailwind v4, the theme provider, Material
   Symbols and `next-intl`.
3. Supabase local setup, first migration (extensions: `ltree`, `pg_cron`, `pgmq`), type
   generation.
4. Tooling: ESLint, Prettier, Vitest, Playwright, pgTAP via `supabase test db`.
5. CI on GitHub Actions: lint, typecheck, unit, database tests, end-to-end smoke, type drift.
6. Environments: Supabase staging and production projects in Frankfurt, Vercel preview and
   production with server code in Frankfurt, error monitoring with EU data storage.
7. Replace `.kiro/steering` and `.kiro/specs` with steering and specs that match this plan, plus
   a `CLAUDE.md` pointing to the same sources (done before Phase 0 started).
8. Install every dependency fresh at its latest stable version; only what is used (`knip` in CI);
   Renovate for weekly updates.

### Phase 1: Identity and workspaces

Sign-up and sign-in (email, Google), profile trigger, onboarding with templates, workspace
switcher, invites, members, roles and the permission functions with full RLS tests, features with
dependencies and plan limits, audit log, notifications (in-app + email service), the adaptive
shell, and settings pages for these. **Outcome:** anyone can create a workspace and invite people
with the right access.

### Phase 2: Organization and people

Starts with the DataTable and DataGrid component specs (full API) and a spike measuring both
against the performance targets in `product-decisions.md`. Then: org unit levels and units, positions, career levels, employment types with cost methods, custom
fields, effective-dated assignments and compensation, closure tables, people directory and
profile with history, org chart (canvas and person view, "as of" date), the data table and tree
select components, import (upload, map, preview, apply, re-import with leavers, error report) on
the jobs pipeline, CSV/Excel export. **Outcome:** a 100k-person organization can be loaded,
browsed and kept up to date.

### Phase 3: Time

Work schedules, holiday calendars with the data source and country templates, time types,
allowance policies and ledger, booking RPCs with approvals, accrual/carry-over/expiry schedules,
calendar views, team availability, the calendar feed, approval notifications by email.
**Outcome:** personal, team and company workspaces can run leave and events end to end.

### Phase 4: Planning

Scenarios with lifecycle and locking, planned roles (and open roles on the org chart), the
allocation grid (virtualized, desktop edit), rate cards with dated rates and the condition
builder, the engine and the apply job, cost totals by team and by custom field.
**Outcome:** finance teams can plan FTE and cost per scenario.

### Phase 5: Completion and launch

Role dashboards, GDPR export/erase/retention jobs, load tests at 100k members, accessibility
audit (WCAG 2.2 AA), security review of every policy, backups and point-in-time recovery,
data processing agreement and sub-processor list, user documentation, production launch.

### Later (backlog, from the decisions)

Workspace merge flow, domain-based join suggestions, paid plans and billing (EU VAT, e-Factura),
SSO per workspace, HR-system connectors, multi-step approvals and delegates, leave in hours,
two-way calendar sync, away time reducing capacity, plan vs actual, multiple currencies per
workspace, report builder and Budgets, AI assistant, Teams/Slack, more languages (Romanian
first), regional deployments, sensitive-field view log and legal hold, installable app with push.

---

## 5. Testing, CI and environments

| Level | Tool | Covers |
|---|---|---|
| Database | pgTAP (`supabase test db`) | Every RLS policy per role, every RPC's rules and failure cases, working-day function, closure maintenance |
| Unit | Vitest | Rate-card engine, cost maths, import mapping and change detection, formatting, zod schemas |
| End to end | Playwright | Sign-up → workspace → invite; import → org chart; book → approve → balance; scenario → apply → totals; at phone, tablet and desktop sizes |
| Load | Seed generator + scripted queries | 100k-member workspace: list, search, reach checks, capacity totals |

CI runs on every push: lint, typecheck, unit, database tests against local Supabase, end-to-end
smoke, generated-types drift check. Load tests run nightly. Migrations reach staging on merge and
production on release, never with `db push`.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| RLS rules become complex and slow at 100k members | Few, well-tested permission functions; closure tables; load tests from Phase 2 |
| Effective dating adds complexity everywhere | One `org_as_of` function and assignment tables; current-date closures for everyday queries |
| Windmorph gaps (data table, calendar grid, tree) slow the UI | Build the data table first in Phase 2; keep APIs Windmorph-style so they can move into windmorph-pro |
| Private `@windmorph/react-pro` install in Vercel and CI | Read-only token for the private repo in both; document the setup in Phase 0 |
| Holiday data is wrong for some country | Maintained data source, editable per workspace, tests for key countries |
| Logic in SQL is harder to review | Small functions, pgTAP tests for each rule, logic ported from `main` with its old tests as a reference |
| Large-client procurement (security reviews, DPA) delays deals | Audit log, retention and DPA in v1; security documentation in Phase 5 |
| Scope is large | Phases ship usable increments; everything in "Later" stays out until v1 launches |
