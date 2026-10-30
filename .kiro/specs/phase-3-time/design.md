# Design Document: Phase 3 time

Sources: `docs/product-decisions.md` §10 (time types, rules, approval) and "Worldwide",
`docs/rebuild-plan.md` §2.3, the permission catalogue (`time.view`, `time.book`,
`time.book_for_others`, `time.approve`, `time.adjust_allowance`, `time.manage_settings`). Rules to
port from `main` (and re-test): the status machine, working days, balance and accrual, generalized.

Known bugs from the audit that this design removes: mixed user IDs in bookings and balances, no
tenant filter on approve/reject/cancel, self-approval, wrong-year deduction, non-transactional
writes, accrual never scheduled.

## Tables

All with `workspace_id`, RLS, audit, composite foreign keys within the workspace, and grants only
through the policies or RPCs listed.

### Working time

| Table               | Columns (beyond id, workspace_id, timestamps)                                                                         | Notes                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `work_schedules`    | name, `working_days smallint[]` (ISO 1–7), `hours_per_day numeric` (for later hours leave), `is_default`, archived_at | One default per workspace, seeded Mon–Fri; editable (e.g. Sun–Thu, or part-time Mon–Wed).      |
| `holiday_calendars` | name, `country char(2)`, `region text`, `source` (`generated` or `custom`), `is_default`, archived_at                 | **Per-workspace copies**, so each workspace edits its own.                                     |
| `holidays`          | calendar_id, `date`, name, `portion numeric` (1 or 0.5), `edited boolean`                                             | Unique (calendar, date). Generated rows are refreshed; rows a person edited or added are kept. |

`member_assignments` gains `work_schedule_id` and `holiday_calendar_id` (null = the workspace
default), so a schedule or calendar change is a dated job change like any other.

**Holiday data:** Postgres can't run the `date-holidays` library, so the app generates holidays:
when a calendar is added (this year and the next two) and from a yearly Vercel cron that extends
every generated calendar one year ahead. Re-generation never touches edited rows.

### Time types and allowances

| Table                       | Columns                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `time_types`                | name, color, icon, `uses_allowance`, `needs_approval`, `is_away`, `visibility` (`everyone`, `team`, `private`), `paid`, `bookable_by` (`everyone`, `managers`, `admins`), `book_for_others`, `approver` (`line_manager`, `team_lead`, `person`, `role`, `none`), approver_member_id, approver_role_id, `notify_role_id` (e.g. HR told about sick leave), `allows_recurrence`, sort_order, archived_at |
| `allowance_policies`        | time_type_id, name, `days_per_year numeric`, `accrual` (`upfront`, `monthly`), `year_start_month smallint`, `carry_over_max numeric` (null = all, 0 = none), `carry_over_expires_months smallint` (null = never), `prorate_by_schedule boolean`, `is_default`, archived_at                                                                                                                            |
| `member_allowance_policies` | member_id, policy_id, valid_from, valid_to (no overlap per time type)                                                                                                                                                                                                                                                                                                                                 |
| `allowance_ledger`          | member_id, time_type_id, `leave_year date` (the year's first day), `kind` (`grant`, `accrual`, `adjustment`, `usage`, `refund`, `carry_over`, `expiry`), `days numeric` (signed), booking_id, reason, created_by, created_at. **Append-only**: no update or delete for anyone.                                                                                                                        |

**Balance = sum of the ledger** for (person, time type, leave year), minus pending requests
(shown as "requested"). Every number on screen can be explained row by row.

Templates: country starters (RO 20 days, UK 28 including bank holidays, US none) and starter time
types per workspace template (Personal, Team, Company), all editable.

### Bookings

| Table                  | Columns                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bookings`             | time_type_id, created_by (member), `start_date`, `end_date`, `start_half` (`full`, `afternoon`), `end_half` (`full`, `morning`), or `starts_at`/`ends_at timestamptz` for timed events, time_zone, title, notes, `status` (`pending`, `approved`, `rejected`, `cancelled`), `recurrence_rule text`, cancelled_at, cancel_reason |
| `booking_attendees`    | booking_id, member_id, `working_days numeric` (per person: their schedule and holidays differ)                                                                                                                                                                                                                                  |
| `booking_approvals`    | booking_id, step, approver_member_id (resolved when booked), `decision` (`pending`, `approved`, `rejected`), comment, decided_by, decided_at. One step in v1; the table allows chains.                                                                                                                                          |
| `calendar_feed_tokens` | user_id, scope (`me`, `team`, `workspace`), `token_hash`, created_at, last_used_at, revoked_at                                                                                                                                                                                                                                  |

Leave is one person per booking; team bookings are for types without an allowance (team events).

## Functions

- `app.working_days(member, start_date, start_half, end_date, end_half)`: the person's schedule on
  each day (from their job record on that day) minus holidays in their calendar; half days 0.5;
  holiday portions respected. Tested against country examples.
- RPCs, each checking every rule and writing booking, approval and ledger rows in one transaction,
  then queuing notifications: `book_time`, `approve_booking`, `reject_booking`, `cancel_booking`
  (refund to the ledger), `adjust_allowance` (with a reason).
- Rules in the RPCs: who may book the type (and for whom), no overlapping away time for a person,
  enough allowance (pending requests count), **no self-approval**, the approver resolved at booking
  time (no one to route to → a workspace admin), personal workspaces approve automatically.
- `calendar_entries(workspace, from, to, scope)`: one read for every calendar view, masking private
  types as "busy" for people who aren't allowed the detail; recurring events expanded for the
  range.
- `pg_cron`: monthly accrual, and at each leave-year start carry-over (capped) and expiry.

## Visibility

Bookings follow `time.view` reach over each attendee (own, reports, team, team and below, units,
workspace), using `app.visible_members`. Type visibility then narrows what's shown: `team` types
only to people in the same unit, `private` types as "busy".

## Critique

- **Holidays in the app, not the database.** A yearly cron must run, or calendars stop a year
  ahead. Mitigation: generate three years on creation, and the settings screen shows how far each
  calendar reaches with a "generate more" button.
- **Approver resolved at booking time.** If the manager changes while a request waits, it stays
  with the first approver. People with `time.approve` at workspace reach can decide any request,
  so nothing gets stuck.
- **Recurrence is expanded on read.** Fine for events; recurring away time would make availability
  and allowance counts harder, so recurrence is limited to types with `allows_recurrence` (no
  allowance, no approval).
- **Days only.** Hours leave comes later; `hours_per_day` is stored now so it can.
- **Overlap check in the RPC, not a constraint.** Half days make an exclusion constraint awkward;
  the RPC locks the person's bookings for the range while checking.
- **Pro-rata** uses the schedule in force on the leave year's first day (or the start date); a
  schedule change mid-year doesn't re-grant automatically, so an admin adjusts with a reason.

## Decisions (2026-10-30, recorded in product-decisions.md)

1. Part-time allowance: **pro-rata from the work schedule** when the policy's `prorate_by_schedule`
   is on (days in the schedule ÷ 5); admins can still adjust with a reason.
2. Leave year: **per policy** (`year_start_month`, default January).
3. Recurrence: **events only** (`allows_recurrence` only on types without allowance or approval).
4. Holiday calendars: **per-workspace editable copies**.
