# Implementation Plan: Phase 2 organization and people

## Overview

Database first (done), then the DataTable and DataGrid components, then the screens. The approved
schema changes are recorded in `docs/product-decisions.md` (Structure, History).

## Tasks

- [x] 1. Structure database
  - [x] 1.1 Workspace-defined hierarchy levels; unit tree as ltree paths (skipped levels allowed,
        cycles and higher levels refused, subtree moves); root unit per workspace
  - [x] 1.2 One career ladder with optional tracks, positions with a level range, employment types
        with a cost method; starter employment types for Team and Company templates
  - [x] 1.3 pgTAP: seeding, level order, cycles, subtree moves, root protection, access, audit

- [x] 2. People database
  - [x] 2.1 Start and end dates; dated job records and pay with no overlaps; `app.assignment_on`
  - [x] 2.2 Custom fields (standard or sensitive, optional history) and values
  - [x] 2.3 Reporting lines precomputed from today's job records, on change and nightly; cycles refused
  - [x] 2.4 All six reaches in `app.can`, with specific units through `member_role_units`
  - [x] 2.5 pgTAP: every reach, pay and sensitive-field privacy, overlaps, cycles, future moves

- [x] 3. Import database
  - [x] 3.1 Staged rows, preview (new / changed / unchanged / errors / leaving), saved mappings
  - [x] 3.2 Resumable chunked apply: people, managers, leavers, one reporting-line rebuild; history
        kept; rows deleted after apply; importer notified; nightly deactivation of leavers
  - [x] 3.3 pgTAP: first import, re-import with a move, a new person and a leaver, permissions

- [x] 4. Saved table views (personal and shared, one default per table)

- [ ] 5. DataTable and DataGrid (`.kiro/specs/data-table-and-grid`)
  - [x] 5.1 Spike: prototypes measured against the performance targets (100 to 100k rows, a
        2,000 × 24 grid); results and decisions recorded in the design
  - [ ] 5.2 DataTable: columns, sort, selection, bulk actions, filters, pagination, server mode,
        column settings with reorder, saved views, phone list layout; keyboard and screen-reader
        checks
    - [x] Columns, sort, resize, selection with a bulk bar, search, filters slot, pagination,
          client and server mode, loading/error/empty states, column settings (show, hide, drag
          or button reorder), phone list; e2e and axe at three widths
    - [ ] Multi-sort, pinned columns, column filters, saved views (with the people directory)
  - [ ] 5.3 Benchmarks in CI

- [x] 6. Structure settings
  - [x] 6.1 Hierarchy: levels, and the unit tree with add, rename, move and archive (Settings >
        Hierarchy; rules for level changes, archiving and reordering in the database)
  - [x] 6.2 Positions, career levels, employment types (Settings > Jobs; a position's level
        range runs up one track)
  - [x] 6.3 Custom fields and their options (Settings > Custom fields; the key is fixed and the
        type locks once people have values)

- [ ] 7. People
  - [ ] 7.1 Directory: DataTable in server mode with search, filters, saved views, export
  - [ ] 7.2 Profile: details, current job, history timeline, future-dated changes, pay (with
        permission), custom fields
  - [ ] 7.3 Add person, edit, set an end date
  - [ ] 7.4 Specific-units picker in role assignment

- [ ] 8. Org chart
  - [ ] 8.1 Reporting chart and grouped hierarchy view (xyflow + ELK in a web worker), expanded on
        demand, "as of" a date
  - [ ] 8.2 Person view on phones

- [ ] 9. Import screens
  - [ ] 9.1 Upload (CSV, Excel), map columns (saved per workspace), choose key and levels
  - [ ] 9.2 Preview with counts and errors; apply with progress; resume an unfinished import

- [ ] 10. Load and end to end
  - [ ] 10.1 100k-member seed generator and load checks for the directory, reach and import
  - [ ] 10.2 Playwright: structure, people, profile history, org chart, import and re-import, at
        three widths
