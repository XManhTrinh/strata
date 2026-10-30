# Implementation Plan: Phase 3 time

Design and decisions: `design.md` (approved 2026-10-30).

## Tasks

- [x] 1. Time settings database: work schedules, holiday calendars (per-workspace copies), time
      types, allowance policies, per-person policies, append-only ledger; starter settings per
      template and country; schedule and calendar on the dated job record
- [x] 2. Working days and allowances: per-day working time from schedule and holidays (half days);
      leave year per policy; pro-rata and joiners; grants, monthly accruals, capped carry-over and
      expiry, settled nightly and on read; balances and adjustments with a reason
- [x] 3. Booking functions: book (who may book, overlaps, allowance per leave year, approval routing,
      notifications), decide (no self-approval, refunds), cancel (refunds); calendar read with
      private and team visibility; pending approvals; working-days preview
- [x] 4. Time settings screens: time types, allowance policies, work schedules, holiday calendars
      generated from `date-holidays` (country and region, a year at a time, edits kept)
- [x] 5. Time off screens
  - [x] 5.1 My time off: balances (explained), bookings with status, book (working days and what's
        left), cancel
  - [x] 5.2 Approvals: approve, or decline with a reason
  - [x] 5.3 Calendar: who's away by month (people × days), list on phones
  - [x] 5.4 Booking for others (managers, admins) and team events for several people
  - [x] 5.5 Week and list views; recurring events (expanded with `rrule`)
  - [x] 5.6 Balances and adjustments on the person's profile
- [x] 6. Calendar feed: revocable links, iCalendar output for me, my team, the workspace
- [ ] 7. Notification emails for requests, decisions and reminders
- [x] 8. Load checks for bookings and the calendar at 100k people
  - [x] e2e: a report asks, the manager approves, books a team event and adjusts a balance
