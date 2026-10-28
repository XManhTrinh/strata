# Requirements Document

## Introduction

`DataTable` (browse, select, act on rows) and `DataGrid` (spreadsheet-style editing) are built in
`src/components/ui` as future `@windmorph/react-pro` components: a full, Windmorph-style API,
Material Design 3 visuals with Windmorph tokens, accessible, and fast at 100k rows. They are
built at the start of Phase 2, after a spike that measures them against the performance targets.
Tasks are written when Phase 2 starts.

Sources: `docs/product-decisions.md` (Components Windmorph doesn't have),
`docs/architecture/0001-tech-stack.md` (Data table, Data grid).

## Glossary

- **DataTable**: the row-browsing table component.
- **DataGrid**: the cell-editing grid component, sharing DataTable's column API.
- **Column_Def**: a typed column definition.
- **Table_State**: one serializable object holding column order, visibility, widths, pinning,
  sort, filters, page and selection.
- **Server_Mode**: the table reports state changes and the app supplies rows and totals.
- **Client_Mode**: the table sorts, filters and pages the rows it is given.

## Requirements

### Requirement 1: Columns

1. THE DataTable SHALL accept Column_Defs with id, header, accessor, cell renderer, type (text,
   number, currency, date, chip, avatar, actions), alignment, width, min and max width.
2. THE DataTable SHALL let users resize, hide and pin columns (start or end) where the Column_Def
   allows it.
3. THE DataTable SHALL let users **reorder columns** by dragging headers and from a column
   settings panel with drag handles and "move up/down" actions usable by keyboard.
4. THE column settings panel SHALL offer show/hide, reorder, pin and "reset to default".

### Requirement 2: Sorting

1. WHEN a user activates a sortable header, THE DataTable SHALL cycle ascending, descending, none.
2. WHEN a user holds Shift while activating a header, THE DataTable SHALL add a secondary sort.
3. THE DataTable SHALL expose `aria-sort` and announce sort changes.

### Requirement 3: Selection and bulk actions

1. THE DataTable SHALL support selection modes none, single and multiple, with a checkbox column
   in multiple mode.
2. THE header checkbox SHALL select the visible page; THE DataTable SHALL then offer "select all
   N matching rows" in Server_Mode.
3. THE DataTable SHALL support rows that cannot be selected.
4. WHEN rows are selected, THE DataTable SHALL show a bulk action bar in place of the toolbar with
   the selection count and the app's actions.

### Requirement 4: Filtering and search

1. THE DataTable SHALL support a global search field and per-column filters by type (text
   contains, number range, date range, choice).
2. THE DataTable SHALL show active filters as removable chips.

### Requirement 5: Pagination and scrolling

1. THE DataTable SHALL support Material 3 pagination (rows per page, range "1–50 of 100,000",
   previous/next) and continuous scrolling with virtualization.
2. In Server_Mode THE DataTable SHALL use a total row count supplied by the app.

### Requirement 6: Data modes and state

1. THE DataTable SHALL work in Client_Mode and Server_Mode with the same API.
2. THE DataTable SHALL work uncontrolled (`defaultState`) or controlled (`state`,
   `onStateChange`), like other Windmorph components.
3. Table_State SHALL be serializable so the app can save and restore views.

### Requirement 7: Rows and appearance

1. THE DataTable SHALL support row activation (open), a per-row action menu, comfortable and
   compact density, and a sticky header.
2. THE DataTable SHALL show skeleton rows while loading, an EmptyState when empty, and an error
   state with retry.
3. Below 600px, THE DataTable SHALL render as a list using a row-to-list-item mapping supplied by
   the app.
4. THE DataTable SHALL use only Windmorph tokens and M3 type roles; all labels SHALL be
   translatable through props.

### Requirement 8: Accessibility

1. THE DataTable SHALL implement the ARIA grid pattern with full keyboard navigation, visible
   focus and screen-reader support, including row and column counts in Server_Mode.
2. Every drag interaction SHALL have a keyboard alternative.

### Requirement 9: DataGrid editing

1. THE DataGrid SHALL share the Column_Def API and add editable cells with typed editors
   (number, text, select) built from Windmorph inputs.
2. THE DataGrid SHALL support arrow-key movement between cells, Enter/F2 to edit, Escape to
   cancel, Tab to move, and typing to start editing.
3. THE DataGrid SHALL support copy and paste of cell ranges as tab-separated text.
4. THE DataGrid SHALL freeze leading columns and virtualize rows and columns.
5. THE DataGrid SHALL validate edits through a per-column validator and mark invalid cells.
6. THE DataGrid SHALL show app-supplied total rows (totals are computed by the app/database).

### Requirement 10: Performance

1. First rows SHALL be visible < 100ms after data arrives.
2. Scrolling SHALL stay at 60 fps through 100k rows.
3. Typing in a DataGrid cell SHALL take < 16ms per keystroke.
4. Benchmarks SHALL run in CI and fail on regressions beyond 10%.
5. IF the DataGrid spike misses these targets, THEN the DataGrid SHALL be built on AG Grid
   Community themed with Windmorph tokens, keeping the same Column_Def API.
