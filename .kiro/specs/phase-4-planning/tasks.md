# Implementation Plan: Phase 4 planning

Design and decisions: `design.md` (approved 2026-10-30).

## Tasks

- [x] 1. Planning database: settings, scenarios, planned roles, allocations, `planning.view_cost`;
      create, copy, lifecycle, live, save allocations (reach, locks, over-allocation, audit), fill
- [x] 2. Rate cards database: sets, groups, cards, conditions, dated rates; SQL engine
      (`match_rate_card`, `apply_rate_cards`) and cost snapshots; totals with roll-up and split
- [x] 3. Planning settings and rate card screens (condition builder, dated rates, preview)
- [x] 4. Scenarios: list, create, copy, compare side by side, lifecycle, live
- [x] 5. Allocation grid: virtualized, desktop edit, read-only elsewhere, over/under highlighting;
      planned roles and filling; open roles on the org chart
- [x] 6. Totals: FTE, headcount and cost by team and by custom field; exports
- [ ] 7. Load checks for allocations, apply and totals at 100k people
