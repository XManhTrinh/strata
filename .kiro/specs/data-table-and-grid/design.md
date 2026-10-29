# Design Document: DataTable and DataGrid

## Foundations

| Part                           | DataTable                                          | DataGrid                                                   |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------------------- |
| Structure and accessibility    | `react-aria-components` Table                      | Own ARIA grid keyboard model with React Aria focus helpers |
| Virtualization                 | React Aria `Virtualizer`                           | `@tanstack/react-virtual` (rows and columns)               |
| Drag and drop (column reorder) | React Aria drag and drop                           | Same                                                       |
| Styling                        | `tailwind-variants` + Windmorph tokens             | Same                                                       |
| Inputs                         | Windmorph Checkbox, Menu, SearchBar, chips, Select | Windmorph TextField/Select as editors                      |

## API sketch

```tsx
<DataTable<Person>
  aria-label="People"
  columns={columns}                  // ColumnDef<Person>[]
  rows={rows}
  getRowId={(p) => p.id}
  mode="server"                      // "client" | "server"
  rowCount={total}                   // server mode
  state={state}                      // controlled Table_State (or defaultState)
  onStateChange={setState}
  selectionMode="multiple"
  isRowSelectable={(p) => p.status !== "inactive"}
  bulkActions={(selection) => <Button>Export</Button>}
  rowActions={(p) => [{ id: "open", label: t("open") }]}
  onRowAction={(p) => router.push(...)}
  pagination={{ pageSizes: [25, 50, 100] }}   // or virtualized: true
  density="comfortable"
  loading={isLoading}
  error={error} onRetry={refetch}
  empty={<EmptyState ... />}
  compactListItem={(p) => ({ headline: p.name, supporting: p.team })}
  labels={tableLabels}               // all strings, translatable
/>
```

```ts
type ColumnDef<T> = {
  id: string;
  header: string;
  accessor?: (row: T) => unknown;
  cell?: (row: T) => ReactNode;
  type?: "text" | "number" | "currency" | "date" | "chip" | "avatar" | "actions";
  align?: "start" | "end" | "center";
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filter?: FilterDef;
  hideable?: boolean;
  pinnable?: boolean;
  reorderable?: boolean;
  resizable?: boolean;
  editor?: EditorDef<T>; // DataGrid only
  validate?: (value: unknown, row: T) => string | null; // DataGrid only
};

type TableState = {
  columnOrder: string[];
  hidden: string[];
  widths: Record<string, number>;
  pinned: { start: string[]; end: string[] };
  sort: { id: string; desc: boolean }[];
  filters: Record<string, FilterValue>;
  search: string;
  page: { index: number; size: number };
  selection: { ids: string[]; allMatching: boolean };
};
```

## Files

```
src/components/ui/data-table/
  data-table.tsx, column-settings.tsx, bulk-action-bar.tsx, filter-chips.tsx,
  pagination.tsx, compact-list.tsx, use-table-state.ts, client-model.ts, types.ts,
  data-table.styles.ts, index.ts
src/components/ui/data-grid/
  data-grid.tsx, grid-keyboard.ts, cell-editor.tsx, clipboard.ts, use-grid-virtual.ts,
  data-grid.styles.ts, index.ts
```

No Strata imports inside these folders, so they can move to windmorph-pro unchanged.

## Spike (first step of Phase 2)

Prototype both with 100k generated people and a 2,000 × 24 grid; measure the targets with
Playwright performance traces; test with keyboard, VoiceOver and NVDA. Record results in this
document before building the full components.

## Spike results (2026-10-29)

Measured on a production build in headless Chrome (desktop, 1440 × 900) with
`e2e/perf/spike.spec.ts` (`STRATA_DEV_PAGES=1 pnpm start`, then `PERF=1 pnpm test:e2e e2e/perf`).

**DataTable: React Aria Table + Virtualizer, rows held in the browser**

| Rows in the browser | First rows | Scroll (avg / p95 frame) | Sort      |
| ------------------- | ---------- | ------------------------ | --------- |
| 100                 | 25 ms      | 60 fps / 17.9 ms         | 21 ms     |
| 1,000               | 36 ms      | 60 fps / 17.4 ms         | 34 ms     |
| 10,000              | 130 ms     | 56 fps / 23.3 ms         | 167 ms    |
| 100,000             | 1,298 ms   | 6 fps / 384 ms           | 16,261 ms |

React Aria builds a collection of every row up front, which is fast up to a few thousand rows and
fails at 100,000. Decisions:

- **Server mode is the default for large data**: the database sorts and filters; the table holds a
  page (25 / 50 / 100 rows) or a continuously loaded window.
- **Continuous scrolling caps what it holds at 5,000 rows**, then asks the user to narrow with
  search or filters.
- **Client mode is for lists up to about 5,000 rows** (settings lists, import preview pages).
- **Virtualized modes render in the browser only.** On the server a virtualizer has no viewport and
  renders every row (the 100k spike page hung server rendering until this was done).

**DataGrid: own ARIA grid + TanStack Virtual (rows and columns), values outside React state**

| Measure                          | Result                    | Target  |
| -------------------------------- | ------------------------- | ------- |
| Scroll 2,000 × 24 cells          | 60 fps, p95 frame 17.6 ms | 60 fps  |
| Keystroke processing (max of 41) | 0.7 ms                    | < 16 ms |

The approach meets the targets with a wide margin; the AG Grid fallback is not needed. Cell values
live in a mutable store, so typing re-renders only the edited cell.

Notes: a p95 frame of about 17.5 ms is one 60 Hz frame within timer precision. Headless Chrome on
an Apple-silicon Mac is faster than a typical office laptop, so CI benchmarks compare against a
saved baseline (fail on a regression over 10%) rather than these absolute numbers.
