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
