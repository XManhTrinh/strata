# Requirements Document (outline)

## Introduction

Phase 2 delivers the organization: hierarchy, positions, career levels, employment types, custom
fields, people with effective-dated history, the org chart, import/re-import and exports. It
starts with the DataTable/DataGrid spike (`.kiro/specs/data-table-and-grid`). Detailed acceptance
criteria and tasks are written when the phase starts.

Sources: `docs/product-decisions.md` (sections 1, 5, 6, 7, 9, Devices),
`docs/rebuild-plan.md` (section 2.2).

## Requirements (to be expanded)

1. **Hierarchy:** workspace-defined org unit levels (name, order, icon, colour); org units in a
   tree with move and archive; cycle prevention; closure maintained.
2. **Positions and career levels:** a levelling scheme per workspace; positions with a level range.
3. **Employment types:** workspace-defined options, each with a cost method (annual salary or day
   rate).
4. **Custom fields:** types, visibility, required, keep-history, import key; usable in tables,
   filters, search, rate-card conditions, import and permissions.
5. **People:** directory (DataTable, saved views) and profile; person key per workspace; manual
   add, edit, deactivate; country and time zone.
6. **History:** effective-dated assignments (unit, manager, position, level, employment type,
   schedule, holiday calendar) and compensation; future-dated changes; "as of date" views.
7. **Reporting lines:** one manager per member per workspace at a time; cycle prevention;
   reporting closure; `reports`, `team`, `team_and_below` and `units` reach tested end to end.
8. **Sensitive data:** compensation visible only through `people.view_compensation` reach.
9. **Org chart:** reporting chart and grouped hierarchy view (xyflow + ELK in a worker), expand on
   demand, "as of date", open roles placeholder; person view on phones.
10. **Import and re-import:** upload (CSV/Excel), saved column mapping, match by person key,
    preview ("X new, Y changed, Z leaving"), apply as a resumable batch job, error report,
    leavers marked inactive, dated changes; 100k rows.
11. **Export:** CSV/Excel from every table with current filters and permissions.
12. **Load:** 100k-member seed generator and nightly load tests.
