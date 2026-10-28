# Requirements Document (outline)

## Introduction

Phase 4 delivers capacity planning with scenarios and planned roles, and rate cards with costing.
Detailed acceptance criteria and tasks are written when the phase starts.

Sources: `docs/product-decisions.md` (Capacity planning; Employment type; Currency and fiscal
year), `docs/rebuild-plan.md` (section 2.4).

## Requirements (to be expanded)

1. **Planning settings:** period (monthly/quarterly), horizon, unit (FTE or %), over-allocation
   (warn/block), basis (person or position), lifecycle, cost split field.
2. **Scenarios:** create from a baseline, edit, compare side by side, mark live; draft →
   submitted → approved; locking of approved plans and past periods.
3. **Planned roles:** vacancies with team, position, employment type, dates and FTE; shown as open
   roles on the org chart; filled by a member.
4. **Allocations:** per member or planned role, team and period; DataGrid editing on desktop,
   read-only elsewhere; over/under-allocation highlighting.
5. **Rate cards:** sets and groups for organization; cards with priority, default flag and
   conditions on any built-in or custom field; dated rates per period with currency.
6. **Apply:** the rate-card engine runs as a batch job and writes cost snapshots per scenario.
7. **Totals:** FTE, headcount and cost by team (with roll-up) and by any custom field; exports.
