# Product decisions

Answers from the product owner that shape the rebuild. See `architecture/0001-tech-stack.md` for the stack.

## 1. Tenancy: workspaces

- **Multi-tenant.** Anyone can sign up: a business, a manager for their team, or an individual who
  only wants calendar and leave.
- **Everything is a workspace.** Company, team and personal workspaces share one model; a template
  chosen at sign-up only sets which features start enabled. Owners can enable or disable features
  at any time.
- **Every workspace has a hierarchy**, even team and personal ones, so one workspace can hold
  several teams (e.g. Squad A and Squad B) instead of needing a workspace per team.
- **One user can belong to many workspaces** and switches between them.

### Merging workspaces

- **Design for it now, build it later.** The schema must allow moving one workspace into another.
- A merge is **always opt-in by both sides**: the source owner requests it, the target admin
  accepts. Keeping workspaces separate is always allowed.
- The target admin chooses where the source hierarchy attaches and maps clashing settings
  (e.g. leave types).
- People are matched by email, so nobody is duplicated; their history (leave requests, balances,
  events) moves with them.
- After a merge the target workspace's admins have authority; the source owner keeps manager rights
  over their teams. The source workspace closes.
- Affected members are notified that their data moved.
- **Later:** when someone signs up with a company email domain that already has a workspace,
  suggest joining it.

### Worldwide from a Romanian base

Strata may launch as a Romanian (EU) company selling worldwide (EU, UK, Americas and beyond).

- **Holiday calendars per country** (and region, e.g. UK nations, US states) from a maintained
  holiday data source.
- **Country leave templates** suggest defaults (e.g. Romania ≥ 20 days, UK 28 incl. bank holidays,
  US no statutory minimum); everything stays editable.
- **Each person has a country and time zone**; leave days and team views use local dates.
- **Formats** follow locale: week start (Monday or Sunday), dates, numbers; currency per workspace.
- **GDPR is home law:** the personal-data decisions are mandatory. Provide a standard data
  processing agreement and a list of sub-processors. The same features cover US laws such as CCPA.
- **Billing (later):** EU VAT and Romanian e-Factura for business invoices.

### Hosting

- **v1: one EU region: Ireland** (Supabase `eu-west-1`, Vercel `dub1`). Chosen over Frankfurt
  as the better midpoint for UK and US users; Romania and Central Europe add about 25ms. Supabase and Vercel server code run there, next to the data;
  Vercel serves static content worldwide from its global network.
- **Every workspace records its data region** from day one.
- **Later:** dedicated deployments in other regions (e.g. UK, US) for customers who require their
  data there. The product doesn't change; each region is its own Supabase project.

### Environments

| Environment | Web                                                                                                | Database                     | Updated                          |
| ----------- | -------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------- |
| Local       | `http://localhost:3000`                                                                            | `supabase start`             | By the developer                 |
| Staging     | **`https://strata-web-xi.vercel.app`** (Vercel project `strata-web`), plus its preview deployments | Supabase `strata-staging`    | Automatically on merge to `main` |
| Production  | Custom domain (to be decided)                                                                      | Supabase `strata-production` | Only by an approved release      |

Preview and staging deployments never use the production database.

## 2. Billing

- **Paid plans later, not in v1.** Every workspace is on a free plan at launch.
- The schema reserves **plans and their limits** now: a plan decides which features a workspace is
  allowed to enable; the workspace admin decides which of those are on.
- No payment integration in v1.

## 3. Scope of version 1

Always included: sign-in, workspaces and templates, members, invites, roles and permissions,
feature switches.

| Module                                                                                   | Release |
| ---------------------------------------------------------------------------------------- | ------- |
| People, hierarchy (org units, positions, career levels, managers), org chart, CSV import | v1      |
| Calendar and leave (events, leave types, requests, approvals, balances, accrual)         | v1      |
| Capacity and rate cards (monthly FTE allocation, rate-card cost engine, cost totals)     | v1      |
| Budgets (cost reports built on capacity)                                                 | Later   |
| AI assistant                                                                             | Later   |

## 4. Data

- **Start fresh.** New empty database with demo seed data; nothing is migrated from the current
  deployment. Real users onboard through sign-up and CSV import.

## 5. Permissions

- A **role** is a set of permissions; each permission is an **action** (e.g. approve leave, view
  salaries, edit capacity) plus a **reach**.
- Reach levels: **own**, **my reports** (direct and indirect), **my team**, **my team and its
  sub-teams**, **specific units** (chosen when the role is assigned, e.g. "HR for Openreach"), and
  **whole workspace**.
- Platform-wide access is for Strata staff only and is separate from customer roles.
- Hierarchy and reporting lines are **precomputed** (who sits under whom) so reach checks stay fast
  at 100k+ people.
- Salary and day rate live apart from the rest of a person's record, under stricter rules.
- Changes to permissions, salaries and approvals go to an **audit log**.

## 6. One product for every size of organization

Strata is built for all organizations, from one person to 100k+ people. **Nothing is built for a
single client.** BT (100k+ people) is expected to be the first large client and serves as the
example of a large organization's needs; every such need becomes a general feature that any
workspace can configure or switch on.

| Instead of (client-specific)                    | Build (general)                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Match people by "UIN"                           | Each workspace picks its unique person key: employee ID, email, or both    |
| A fixed Division > Cluster > Tribe > Squad tree | Workspace-defined hierarchy levels and names                               |
| Fixed Perm/SubCon or Capex/Opex columns         | Custom fields per workspace, usable in filters, rate cards and permissions |
| One CSV layout                                  | Saved column mappings per workspace                                        |
| One HR system                                   | Pluggable people sources feeding one "apply changes" step                  |
| SSO for one client                              | SSO per workspace                                                          |

Large-organization needs, available to any workspace:

- Reach levels and precomputed hierarchy (section 5).
- **Import at scale:** 100k-row files in batches, resumable, with an error report.
- **Audit log** in v1.
- **Data residency:** see Hosting below.
- **Sign-in:** email and Google at launch. SSO (e.g. SAML with Entra ID or Okta) is a per-workspace
  feature added before large rollouts; the auth design allows it from the start.
- Enterprise features (SSO, people-source connectors) switch on per workspace; small workspaces
  never see them.
- Large clients usually **pilot** with one division first, so a workspace must work well with part
  of an organization loaded.
- Plan time for **procurement and security** (questionnaires, DPIA, penetration test, possibly
  ISO 27001 or Cyber Essentials).

## 7. Keeping people up to date

- **v1: re-import.** Admins re-upload a people file. Strata matches rows by the workspace's person
  key, shows a preview ("X new, Y changed, Z leaving"), and applies it once confirmed.
- Joiners are added, moves and changes are updated, and people missing from the file are marked
  **inactive**, never deleted, so their history stays.
- Each workspace saves its column mapping, so re-imports need no setup.
- **Later: connectors** to HR systems (e.g. Workday, SAP SuccessFactors, BambooHR) feed the same
  preview-and-apply step. Manual add, edit and deactivate are always available.

## 8. Components Windmorph doesn't have

- Data table/grid, tree select, calendar month grid, colour/icon picker and breadcrumbs are built
  **in Strata first**, with a Windmorph-style API and Windmorph tokens.
- Generic ones (table, tree select, breadcrumbs, pickers) **move into windmorph-pro** once stable.
- They are built as **complete, reusable components with a full API**, not Strata-only shortcuts:
  a written component spec first, then phased builds, each benchmarked and accessibility-tested.
- Libraries may be used for logic only (headless); everything visible is Material, styled with
  Windmorph tokens.

### DataTable

Typed columns; resize, hide, pin; **reorder by dragging headers or from a column settings panel**
(keyboard accessible); single and multi-column sort; checkbox selection including "all matching
rows"; bulk action bar; per-column filters and global search; Material 3 pagination or virtual
scrolling; client or server data mode with one API; table state as one savable object (saved
views); row click and row menus; density; loading, empty and error states; list layout on phones;
full keyboard and screen-reader support; controlled or uncontrolled like other Windmorph
components; translatable labels.

### DataGrid

A sibling of DataTable with the same column API for spreadsheet-style editing (capacity): cell
editing, keyboard movement between cells, copy/paste, frozen columns, rows and columns
virtualized.

### Performance targets (gate for both)

| Measure                               | Target               |
| ------------------------------------- | -------------------- |
| First rows visible after data arrives | < 100ms              |
| Scrolling through 100k rows           | 60 fps               |
| Typing in a grid cell                 | < 16ms per keystroke |
| Sort or filter 100k people (server)   | < 300ms              |

Phase 2 starts with a spike measuring both against these targets. Fallback for DataGrid only:
AG Grid Community themed with Windmorph tokens.

## 9. People fields

### Custom fields

Each workspace defines its own fields on people (e.g. Grade, Capex/Opex, Location, Skills):

- **Type:** text, number, date, single choice, multiple choice, or person.
- **Visibility:** everyone, managers, HR/admins only, or the person themselves plus HR.
- **Required** or optional; whether it is **filled by import**.
- Usable everywhere a built-in field is: table columns, filters, search, rate-card conditions,
  import mapping and permissions.

### History (effective dating)

- Changes to a person's team, manager, position, grade, employment type, salary and day rate, plus
  any custom field marked "keep history", are stored with an **effective date**.
- Changes can be entered ahead of time (e.g. a move on 1 March) and take effect on that date.
- Org chart, teams and costs can be viewed **as of any date**.
- Capacity and cost use the values valid in each period.
- Re-imports create dated changes rather than overwriting.

### Employment type

- A **built-in field whose options each workspace defines** (e.g. Perm, SubCon, Fixed-term, Temp;
  or Employee, Freelancer, Intern).
- Each option has a **cost method**: annual salary or day rate × working days (hourly later).
  Capacity and rate cards use it to cost people correctly.

## 10. Calendar, time types and leave

### Time types

Leave, absences, team events and personal events are one concept: **time types**, created and
edited by each workspace (starter templates suggest common ones). Each type has:

| Setting           | Meaning                                                           |
| ----------------- | ----------------------------------------------------------------- |
| Uses an allowance | Deducts from a balance (e.g. 25 days of annual leave), or not     |
| Needs approval    | Goes to the type's approver (see Approval), or is booked directly |
| Person is away    | Counts as unavailable in team availability                        |
| Visibility        | Everyone, team only, or private (others see "busy")               |
| Paid or unpaid    | For reports, later for payroll export                             |
| Who can book it   | Everyone, managers only, or admins only                           |
| Book for others   | Whether managers/admins can book it on someone's behalf           |

Examples: _Annual leave_ (allowance, line-manager approval, away); _Training_ (no allowance,
line-manager approval, away); _Event_ (no allowance, no approval); _Working from home_ (no
allowance, no approval, not away).

- A type can be booked for one person or for a group/team (team events).
- One calendar and one booking flow for all types.
- **v1:** a one-way calendar feed link (subscribe from Google Calendar or Outlook).
- **Later:** two-way Google/Outlook sync; "away" time reducing capacity (v1 capacity uses planned
  FTE only).

### Rules

All configured per workspace.

| Rule                                                                                                                                         | Release |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Public holiday calendars (e.g. England, Scotland, US); a workspace default, or one per person by location; holidays are not counted as leave | v1      |
| Half days (morning or afternoon, 0.5 day)                                                                                                    | v1      |
| Custom working week, per workspace or per person (e.g. Sun–Thu, part-time Mon–Wed)                                                           | v1      |
| Leave in hours                                                                                                                               | Later   |

### Approval

- **v1: approver per leave type.** Each leave type sets its approver: line manager, team lead, a
  specific person or role (e.g. HR), or no approval (e.g. sick leave, with HR notified).
- With no one to route to (e.g. no manager), the request goes to a workspace admin.
- **Later:** multi-step chains (e.g. line manager, then HR) and delegates who approve while the
  approver is away. The v1 design allows adding steps.

## 11. Capacity planning

People (or planned roles) get an allocation per period per team; cost comes from rate cards and
the employment type's cost method.

- **v1: planned roles (vacancies).** A placeholder (role, team, start date, FTE) counts in capacity
  and cost, shows on the org chart as an open role, and is filled by a real person when hired.
- **v1: scenarios.** Copy a baseline, edit, compare side by side, mark one as the live plan.
- **Later: plan vs actual**, using actual people, away time and costs.

Workspace settings, so each organization plans its own way:

| Setting          | Options                                                              | Default                       |
| ---------------- | -------------------------------------------------------------------- | ----------------------------- |
| Planning period  | Monthly or quarterly                                                 | Monthly                       |
| Planning horizon | Fiscal years ahead                                                   | 2                             |
| Allocation unit  | FTE (0–1) or percentage                                              | FTE                           |
| Over-allocation  | Warn or block                                                        | Warn                          |
| Planning basis   | By person, or by position (seats people fill)                        | By person, with planned roles |
| Plan lifecycle   | Draft → Submitted → Approved; approved plans and past periods locked | On                            |
| Cost split       | Any custom field (e.g. Capex/Opex) splits cost totals                | None                          |

All plan changes go to the audit log.

## 12. Personal data (GDPR)

- **v1: export.** A person or an admin can download everything Strata holds about a person.
- **v1: erase.** An admin can permanently remove a person; history others depend on stays,
  anonymised (e.g. "Former employee").
- **v1: leavers** are marked inactive and keep their history.
- **v1: retention rules** per workspace (e.g. anonymise leavers 6 years after leaving, delete
  sick-leave reasons after 3 years), applied automatically.
- **Later:** a log of who viewed sensitive fields (e.g. salary), and legal hold.

## 13. Reports and exports

- **v1: export from every table** (people, leave, capacity, rate cards) to CSV or Excel, with the
  current filters and columns, applying the user's permissions.
- **v1: a dashboard per role:** employee (balances, upcoming leave), manager (who's away, pending
  approvals), finance/admin (headcount, FTE and cost by team). Fixed cards, no builder.
- **Later:** a report builder (choose fields, group, filter, chart; save, share, schedule),
  alongside Budgets.

## 14. Currency and fiscal year

- **v1: per-workspace settings.** Each workspace sets its currency and the month its fiscal year
  starts. Capacity periods and quarters follow that start month.
- Every money amount is stored with its currency code from the start.
- **Later:** several currencies within one workspace, converted to a reporting currency using
  admin-entered exchange rates.

## 15. Notifications

- **v1: in-app + email.** A live in-app list (bell) plus email for the same events (approvals to
  act on, decisions, invites, imports finished).
- Each user chooses per category which ones they get by email, and can switch to a daily summary.
- An email service (e.g. Resend or Postmark) is needed regardless for invites and sign-in emails.
- **Later:** Microsoft Teams and Slack, connected per workspace (e.g. approve leave from a Teams
  message).

## 16. Languages

- **English only in v1.** All UI text goes through a translation layer from day one, so languages
  can be added without rewriting screens.
- Dates and numbers follow each user's locale.
- Romanian is the most likely next language.

## 17. Devices

Responsive web app, decided **per screen** using Material 3 window sizes: phone (< 600px),
tablet (600–1199px), desktop (≥ 1200px).

| Screen                                  | Phone                                                   | Tablet                  | Desktop               |
| --------------------------------------- | ------------------------------------------------------- | ----------------------- | --------------------- |
| Request leave, my balances, my calendar | Full                                                    | Full                    | Full                  |
| Approve or reject leave, notifications  | Full                                                    | Full                    | Full                  |
| People directory, person profile        | Search and view                                         | List + detail           | List + detail + table |
| Team calendar                           | List by day                                             | Week/month grid         | Full grid             |
| Org chart                               | Person view (manager above, reports below, tap to move) | Chart canvas            | Chart canvas          |
| Capacity grid                           | Totals, read-only                                       | Totals + read-only grid | Edit                  |
| Rate cards                              | View only                                               | View only               | Edit                  |
| People import                           | "Open on a larger screen"                               | Full                    | Full                  |
| Admin (roles, hierarchy, settings)      | "Open on a larger screen"                               | Full                    | Full                  |

- "Open on a larger screen" shows a short summary and a clear message, never a squeezed layout.
- Navigation adapts: bottom bar on phone, rail on tablet, expanded rail on desktop.
- **No native app planned.** If approval push notifications matter later, the web app becomes
  installable with web push.
