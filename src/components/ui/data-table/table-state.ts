import type { ColumnDef, SortLevel, TableState } from "./types";

export const PAGE_SIZES = [25, 50, 100] as const;

export function initialTableState<Row>(
  columns: ColumnDef<Row>[],
  overrides: Partial<TableState> = {}
): TableState {
  return {
    columnOrder: columns.map((c) => c.id),
    hidden: [],
    widths: {},
    search: "",
    page: { index: 0, size: PAGE_SIZES[1] },
    selection: { ids: [], allMatching: false },
    ...overrides,
    sort: normalizeSort(overrides.sort ?? []),
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

  const levels = state.sort.flatMap((level) => {
    const column = columns.find((c) => c.id === level.column);
    return column ? [{ column, direction: level.direction === "ascending" ? 1 : -1 }] : [];
  });
  if (levels.length > 0) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    result = [...result].sort((a, b) => {
      for (const { column, direction } of levels) {
        const x = column.accessor(a);
        const y = column.accessor(b);
        if (x === y) continue;
        if (x === null) return 1;
        if (y === null) return -1;
        const order =
          typeof x === "number" && typeof y === "number"
            ? x - y
            : collator.compare(String(x), String(y));
        if (order !== 0) return order * direction;
      }
      return 0;
    });
  }

  const start = state.page.index * state.page.size;
  return { pageRows: result.slice(start, start + state.page.size), total: result.length };
}

const MAX_SORT_LEVELS = 3;

/**
 * The sort after pressing a column's header: alone, the column becomes the only sort and cycles
 * ascending, descending, none; with Shift (adding), it joins the sort as the next level (up to
 * three) or, already in it, cycles there.
 */
export function nextSort(current: SortLevel[], column: string, adding: boolean): SortLevel[] {
  const index = current.findIndex((level) => level.column === column);
  const cycled = (level: SortLevel): SortLevel | null =>
    level.direction === "ascending" ? { column, direction: "descending" } : null;
  if (!adding) {
    if (index === 0 && current.length === 1) {
      const next = cycled(current[0]!);
      return next ? [next] : [];
    }
    return [{ column, direction: "ascending" }];
  }
  if (index >= 0) {
    const next = cycled(current[index]!);
    return next
      ? current.map((level, i) => (i === index ? next : level))
      : current.filter((_, i) => i !== index);
  }
  return current.length >= MAX_SORT_LEVELS
    ? current
    : [...current, { column, direction: "ascending" }];
}

/** Reads a saved sort: a list of levels, or (from before multi-column sorting) one level. */
export function normalizeSort(value: unknown): SortLevel[] {
  const levels = Array.isArray(value) ? value : value ? [value] : [];
  return levels
    .filter(
      (l): l is SortLevel =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as SortLevel).column === "string" &&
        ((l as SortLevel).direction === "ascending" || (l as SortLevel).direction === "descending")
    )
    .slice(0, MAX_SORT_LEVELS);
}
