import type { ReactNode } from "react";

export type ColumnType = "text" | "number" | "currency" | "date" | "custom";

export type ColumnDef<Row> = {
  id: string;
  /** Shown above the column and in column settings; never empty (screen readers name it). */
  header: string;
  /** The value used for sorting, searching and default display. */
  accessor: (row: Row) => string | number | null;
  /** Custom cell content; defaults to the accessor's value. */
  cell?: (row: Row) => ReactNode;
  type?: ColumnType;
  align?: "start" | "end";
  width?: number;
  minWidth?: number;
  /**
   * Text that benefits from room (names, emails): the column shares the table's spare width in
   * proportion to its width, never going below it. Short values (dates, levels) keep their width.
   */
  grow?: boolean;
  sortable?: boolean;
  hideable?: boolean;
  /** Whether people may pin it to the start or end. @default true */
  pinnable?: boolean;
  /** The row header (usually the name), announced with each row. */
  isRowHeader?: boolean;
};

export type SortLevel = { column: string; direction: "ascending" | "descending" };

/** Everything a user can change about a table, serializable so it can be saved as a view. */
export type TableState = {
  columnOrder: string[];
  hidden: string[];
  widths: Record<string, number>;
  /** Columns kept in view while the rest scroll sideways, at the start and at the end. */
  pinned: { start: string[]; end: string[] };
  /** Sort levels in order (at most three); empty for the rows as given. */
  sort: SortLevel[];
  search: string;
  page: { index: number; size: number };
  selection: { ids: string[]; allMatching: boolean };
};

export type DataTableLabels = {
  search: string;
  /** The button that shows the filters on phones. */
  filters: string;
  columns: string;
  columnSettingsTitle: string;
  showColumn: (column: string) => string;
  moveUp: (column: string) => string;
  moveDown: (column: string) => string;
  pinMenu: (column: string) => string;
  pinStart: string;
  pinEnd: string;
  unpin: string;
  pinnedStart: string;
  pinnedEnd: string;
  reset: string;
  done: string;
  selectAll: string;
  /** Read before the row's name, which React Aria adds: "Select" → "Select Ana Pop". */
  selectRow: string;
  selected: (count: number) => string;
  selectAllMatching: (count: number) => string;
  clearSelection: string;
  rowsPerPage: string;
  /** A column's place in a sort by several columns: "Sorted second". */
  sortLevel: (level: number) => string;
  range: (from: number, to: number, total: number) => string;
  previousPage: string;
  nextPage: string;
  loading: string;
  retry: string;
};
