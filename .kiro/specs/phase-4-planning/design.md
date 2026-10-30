# Design Document: Phase 4 planning

Approved 2026-10-30. Decisions: `docs/product-decisions.md` section 11. Tables extend
`docs/rebuild-plan.md` section 2.4. Rules ported from `main` history
(`apps/api/src/rate-cards/rate-card-engine.ts`, `apps/api/src/capacity/capacity.service.ts`) and
generalized.

## Decisions

1. **Months only in storage.** `period_start` is always the first of a month; quarterly
   workspaces edit a quarter, which writes its three months. Switching period never migrates data.
2. **Cost is its own permission:** `planning.view_cost` (scoped), separate from `planning.view`
   (FTE), because cost under annual salary reveals pay.
3. **Planned roles belong to a scenario.** The org chart shows the live scenario's open roles.
   Filling one moves its allocations from the fill date onto the person; the role stays as history.
4. **The rate-card engine is SQL:** `app.match_rate_card` (one person or role) and
   `apply_rate_cards(scenario)` (set-based), tested with pgTAP, running as the signed-in user.
5. **By position** is seats as planned roles that people fill; no separate model.
6. **Working days on a rate are entered** (finance convention), not computed from schedules.

## Tables

| Table                  | Columns (besides id, workspace_id, timestamps)                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planning_settings`    | One per workspace: `period` (month/quarter), `horizon_years` (1–5, 2), `display_unit` (fte/percent), `over_allocation` (warn/block), `basis` (person/position), `lifecycle` (bool), `cost_split_field_id` |
| `scenarios`            | name, `first_period`, `last_period`, `baseline_id`, `status` (draft/submitted/approved), `is_live` (one per workspace), `locked_through`, submitted/approved by and at, `costs_applied_at`, `archived_at` |
| `planned_roles`        | scenario, title, org unit, position, career level, employment type, `start_date`, `end_date`, `fte`, `field_values` (jsonb by custom field key), notes, `filled_by`, `filled_on`                          |
| `allocations`          | scenario, member **or** planned role (exactly one), org unit, `period_start` (a month), `fte` (0 < fte ≤ 1); unique per scenario, person or role, unit and month                                          |
| `rate_card_sets`       | name, sort order                                                                                                                                                                                          |
| `rate_card_groups`     | set (nullable), name, sort order                                                                                                                                                                          |
| `rate_cards`           | group (nullable), name, `priority`, `is_default`, `archived_at`                                                                                                                                           |
| `rate_card_conditions` | card, `field` (built-in key or `custom:<key>`), `operator` (7), `value`                                                                                                                                   |
| `rate_card_rates`      | card, `valid_from` (a month), `day_rate`, `working_days`, `currency`; valid until the next one                                                                                                            |
| `cost_snapshots`       | scenario, member or planned role, `period_start`, `rate_card_id` (null when from salary), `source` (rate_card/salary/none), `monthly_cost` at 1.0 FTE, `currency`                                         |

Built-in condition fields: `unit` (name), `unit_code`, `position`, `career_level`,
`employment_type`, `country`. Custom fields by key.

## Rules

- Cards are evaluated by ascending priority; the first non-default card whose conditions all match
  wins, otherwise the first default card. A non-default card with no conditions never matches.
  Archived cards are skipped.
- Operators: equals, not equals, starts with, starts with any (comma list), ends with, contains,
  in (comma list); values trimmed and compared case-insensitively; a missing value is empty.
- Monthly cost for a month = day rate × working days of the rate valid that month. Without a
  matching card, annual-salary employment types cost salary ÷ 12 (the pay valid that month);
  otherwise the cost is none (0, flagged).
- Cost of an allocation = FTE × the snapshot for that month. Totals roll up through the unit
  paths and split by the cost split field.
- Over-allocation: one person's FTE across units in a month above 1 warns or is refused.
- Lifecycle on: only drafts are edited; submit (`planning.edit`), approve or return to draft
  (`planning.approve`); approved scenarios are locked; months before the current month are locked.
  Only an approved scenario can be live (any scenario when lifecycle is off).

## Functions

- `create_scenario(workspace, name, first, last, from_people bool)`, `copy_scenario(id, name)`,
  `set_scenario_status(id, status)`, `set_live_scenario(id)`.
- `save_allocations(scenario, changes jsonb)` re-checks reach, locks and over-allocation; one
  audit entry per save.
- `fill_planned_role(role, member, date)`.
- `match_rate_card(workspace, attributes jsonb, month)` for previews; `apply_rate_cards(scenario)`
  writes `cost_snapshots` for the whole scenario in one statement.
- `capacity_totals(scenario, group_by, from, to)` (FTE, headcount, cost when permitted).

## Access

RLS on every table. `planning.view` and `planning.edit` reach people through their allocation's
unit (and the person's reach for members); `planning.view_cost` hides cost columns and totals;
`rate_cards.*` are workspace-wide; `planning.approve` and `planning.manage_settings` unscoped.
