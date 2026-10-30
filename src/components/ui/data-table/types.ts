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
  sortable?: boolean;
  hideable?: boolean;
  /** The row header (usually the name), announced with each row. */
  isRowHeader?: boolean;
};

/** Everything a user can change about a table, serializable so it can be saved as a view. */
export type TableState = {
  columnOrder: string[];
  hidden: string[];
  widths: Record<string, number>;
  sort: { column: string; direction: "ascending" | "descending" } | null;
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
  reset: string;
  done: string;
  selectAll: string;
  /** Read before the row's name, which React Aria adds: "Select" → "Select Ana Pop". */
  selectRow: string;
  selected: (count: number) => string;
  selectAllMatching: (count: number) => string;
  clearSelection: string;
  rowsPerPage: string;
  range: (from: number, to: number, total: number) => string;
  previousPage: string;
  nextPage: string;
  loading: string;
  retry: string;
};
