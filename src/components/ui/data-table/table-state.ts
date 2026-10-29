import type { ColumnDef, TableState } from "./types";

export const PAGE_SIZES = [25, 50, 100] as const;

export function initialTableState<Row>(
  columns: ColumnDef<Row>[],
  overrides: Partial<TableState> = {}
): TableState {
  return {
    columnOrder: columns.map((c) => c.id),
    hidden: [],
    widths: {},
    sort: null,
    search: "",
    page: { index: 0, size: PAGE_SIZES[1] },
    selection: { ids: [], allMatching: false },
    ...overrides,
  };
}

/** Visible columns in the user's order; columns added later (not in a saved order) go last. */
export function visibleColumns<Row>(
  columns: ColumnDef<Row>[],
  state: TableState
): ColumnDef<Row>[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const ordered = [
    ...state.columnOrder.filter((id) => byId.has(id)),
    ...columns.map((c) => c.id).filter((id) => !state.columnOrder.includes(id)),
  ];
  return ordered.flatMap((id) => {
    const column = byId.get(id)!;
    return state.hidden.includes(id) && column.hideable !== false ? [] : [column];
  });
}

/** Moves a column one place within the full order (keyboard alternative to dragging). */
export function moveColumn(order: string[], id: string, offset: -1 | 1): string[] {
  const from = order.indexOf(id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** Client mode: search, sort and page the rows in the browser (up to a few thousand rows). */
export function applyClientModel<Row>(
  rows: Row[],
  columns: ColumnDef<Row>[],
  state: TableState
): { pageRows: Row[]; total: number } {
  const search = state.search.trim().toLowerCase();
  let result = search
    ? rows.filter((row) =>
        columns.some((c) =>
          String(c.accessor(row) ?? "")
            .toLowerCase()
            .includes(search)
        )
      )
    : rows;

  const sortColumn = state.sort && columns.find((c) => c.id === state.sort!.column);
  if (sortColumn && state.sort) {
    const direction = state.sort.direction === "ascending" ? 1 : -1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    result = [...result].sort((a, b) => {
      const x = sortColumn.accessor(a);
      const y = sortColumn.accessor(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : collator.compare(String(x), String(y))) * direction
      );
    });
  }

  const start = state.page.index * state.page.size;
  return { pageRows: result.slice(start, start + state.page.size), total: result.length };
}
