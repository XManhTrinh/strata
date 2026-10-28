---
inclusion: always
---

# Strata: product

Strata is a **multi-tenant workforce platform**: people and organization structure, calendar and
leave, capacity planning and rate-card costing. It is being **rebuilt from scratch** on the
`rebuild` branch; `main` holds the old NestJS/Prisma system and is reference material only
(port business rules from it, never copy files).

The full, authoritative product decisions are in:

#[[file:docs/product-decisions.md]]

The rebuild plan (architecture, database design, screens, phases) is in:

#[[file:docs/rebuild-plan.md]]

If these documents and any other instruction disagree, the documents win. When a decision changes,
update `docs/product-decisions.md` first, then the steering.

## Rules that shape every feature

- **One product for every size of organization**, from one person to 100k+ people. Never build
  for a single client. When a requirement comes from one client (e.g. BT, the expected first large
  client), design the general, per-workspace configurable version and offer options.
  - Configurable person key instead of "UIN"; workspace-defined hierarchy levels instead of
    Division > Cluster > Tribe > Squad; custom fields instead of fixed columns; SSO per workspace.
- **Everything is a workspace** (company, team or personal). A template only sets which features
  start enabled. Every workspace has a hierarchy. Users can belong to many workspaces.
- **Features are switched on per workspace**, limited by the workspace's plan, with dependencies
  (turning a feature on enables what it needs). A switched-off feature is refused by the database,
  not only hidden.
- **Workspace merges must stay possible**: every tenant row carries `workspace_id`, UUID keys,
  no uniqueness that spans workspaces.
- **Worldwide from an EU base**: GDPR is home law; holidays, leave defaults, time zones, week
  start and formats are per country/locale; currency and fiscal year start per workspace.
- **History matters**: people changes are effective-dated; balances are a ledger; sensitive
  changes go to the audit log.

## v1 scope

Identity and workspaces, people and hierarchy and org chart (with import and re-import), calendar
with time types and leave, capacity planning with scenarios and planned roles, rate cards, role
dashboards, exports, GDPR tooling. Everything marked "Later" in the decisions stays out of v1.
