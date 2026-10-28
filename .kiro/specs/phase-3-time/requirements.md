# Requirements Document (outline)

## Introduction

Phase 3 delivers the calendar, time types, leave, allowances and approvals for personal, team and
company workspaces. Detailed acceptance criteria and tasks are written when the phase starts.

Sources: `docs/product-decisions.md` (Calendar, time types and leave; Worldwide; Notifications),
`docs/rebuild-plan.md` (section 2.3).

## Requirements (to be expanded)

1. **Work schedules:** working days per week, workspace default and per person (effective-dated).
2. **Holiday calendars:** per country and region from `date-holidays`, refreshed by a schedule,
   editable per workspace; assigned per workspace or per person.
3. **Time types:** allowance, approval, away, visibility, paid, who can book, book for others,
   approver rule; starter templates per country.
4. **Allowances:** policies (yearly amount, upfront or monthly accrual, carry-over cap, expiry);
   ledger of every change; balance = sum; adjustments with reason.
5. **Booking:** single person or team; dates with half days, or times for events; recurrence
   (`rrule`); overlap rules; working days counted from schedule and holidays.
6. **Approval:** approver per time type (line manager, team lead, person, role, none); fallback to
   an admin; approve, reject with comment, cancel (restoring allowance); one step in v1, chain-ready.
7. **Schedules:** accrual, carry-over and expiry via `pg_cron`.
8. **Calendar views:** month, week and list; personal, team and workspace; who's away; phone list.
9. **Calendar feed:** one-way iCalendar link per user/team with revocable tokens.
10. **Notifications:** requests, decisions and reminders in-app and by email.
11. **Personal workspaces:** bookings auto-approve; balances still tracked.
