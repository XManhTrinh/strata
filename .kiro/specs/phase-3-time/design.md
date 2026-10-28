# Design Document (outline): Phase 3 time

The table design is `docs/rebuild-plan.md` section 2.3. Rules to port from `main` (and re-test)
are in `apps/api/src/calendar/domain` (status machine, working days, recurrence) and the leave,
balance and accrual services, generalized:

- Status machine: pending → approved | rejected; approved → cancelled; pending → cancelled.
- Working days: the person's schedule minus holidays in their calendar; half days count 0.5;
  dates are in the person's time zone.
- Balance = ledger sum (grants + accruals + adjustments + carry-over − usage − expiry). Pending
  requests reserve allowance.
- Accrual adds the policy amount monthly, capped by the policy maximum; carry-over is capped and
  can expire.
- Recurrence uses `rrule`; instances are expanded for the requested range rather than stored.

Known bugs from the audit that the design removes: mixed user IDs in bookings and balances, no
tenant filter on approve/reject/cancel, self-approval, wrong-year deduction, non-transactional
writes, accrual never scheduled.

Full design is written when the phase starts.
