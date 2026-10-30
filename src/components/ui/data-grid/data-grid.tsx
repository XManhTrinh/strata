"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type GridRow = { id: string; header: string; subheader?: string };
export type GridColumn = { id: string; header: string };
/** How a cell is shown: over or under its target, or changed and not saved yet. */
export type CellTone = "over" | "under" | "changed" | null;

export type DataGridLabels = {
  /** The accessible name of a cell, e.g. "Ana Pop, Jan 2027". */
  cell: (row: GridRow, column: GridColumn) => string;
  /** The header above the row headers. */
  rowHeader: string;
  /** Read after a cell's value when it is over or under. */
  tone: (tone: Exclude<CellTone, null>) => string;
};

export type DataGridProps = {
  "aria-label": string;
  rows: GridRow[];
  columns: GridColumn[];
  value: (rowId: string, columnId: string) => number | null;
  /** Shows a value in a cell and in its editor. */
  format: (value: number | null) => string;
  /** Reads what was typed; `undefined` when it isn't valid (the edit is kept open). */
  parse: (text: string) => number | null | undefined;
  /** When false, cells can be focused and read but not changed. */
  editable: boolean;
  onChange?: (rowId: string, columnId: string, value: number | null) => void;
  tone?: (rowId: string, columnId: string) => CellTone;
  /** Actions shown in the row header, such as a menu. */
  rowActions?: (row: GridRow) => ReactNode;
  labels: DataGridLabels;
  /** The visible height, a CSS length. */
  height?: string;
};

const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 48;
const CELL_WIDTH = 96;
const ROW_HEADER_WIDTH = 260;

const TONE_CLASS: Record<Exclude<CellTone, null>, string> = {
  over: "bg-error-container text-on-error-container",
  under: "bg-tertiary-container text-on-tertiary-container",
  changed: "bg-secondary-container text-on-secondary-container",
};

/**
 * An editable grid of numbers (rows × columns), virtualized both ways, following the ARIA grid
 * pattern: one cell in the tab order, arrow keys move, Enter / F2 / typing edits, Enter and Tab
 * commit and move on, Escape cancels, Delete clears. Only visible cells render, so it holds
 * thousands of rows.
 */
export function DataGrid(props: DataGridProps) {
  const { rows, columns, editable, labels } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState({ row: 0, column: 0 });
  const [editing, setEditing] = useState<{ initial: string } | null>(null);
  const focusPending = useRef(false);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CELL_WIDTH,
    overscan: 3,
  });

  // Keep the active cell inside the grid when rows or columns change.
  const row = Math.min(active.row, Math.max(rows.length - 1, 0));
  const column = Math.min(active.column, Math.max(columns.length - 1, 0));

  const move = useCallback(
    (nextRow: number, nextColumn: number) => {
      const r = Math.max(0, Math.min(rows.length - 1, nextRow));
      const c = Math.max(0, Math.min(columns.length - 1, nextColumn));
      setActive({ row: r, column: c });
      rowVirtualizer.scrollToIndex(r, { align: "auto" });
      columnVirtualizer.scrollToIndex(c, { align: "auto" });
      focusPending.current = true;
    },
    [rows.length, columns.length, rowVirtualizer, columnVirtualizer]
  );

  // Move focus to the active cell once it has rendered.
  useLayoutEffect(() => {
    if (!focusPending.current || editing) return;
    const cell = scrollRef.current?.querySelector<HTMLElement>(`[data-cell="${row}:${column}"]`);
    if (cell) {
      cell.focus({ preventScroll: true });
      focusPending.current = false;
    }
  });

  function commit(text: string, then: "down" | "right" | "stay" | "none") {
    const parsed = props.parse(text);
    if (parsed === undefined) return false;
    const rowId = rows[row]?.id;
    const columnId = columns[column]?.id;
    if (rowId && columnId) props.onChange?.(rowId, columnId, parsed);
    setEditing(null);
    if (then === "down") move(row + 1, column);
    else if (then === "right") move(row, column + 1);
    else if (then === "stay") move(row, column);
    return true;
  }

  function onCellKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (editing) return;
    const page = Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 400) / ROW_HEIGHT) - 1);
    const keys: Record<string, () => void> = {
      ArrowUp: () => move(row - 1, column),
      ArrowDown: () => move(row + 1, column),
      ArrowLeft: () => move(row, column - 1),
      ArrowRight: () => move(row, column + 1),
      PageUp: () => move(row - page, column),
      PageDown: () => move(row + page, column),
      Home: () => (event.ctrlKey ? move(0, 0) : move(row, 0)),
      End: () =>
        event.ctrlKey ? move(rows.length - 1, columns.length - 1) : move(row, columns.length - 1),
    };
    if (keys[event.key]) {
      event.preventDefault();
      keys[event.key]!();
      return;
    }
    if (!editable) return;
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      setEditing({ initial: props.format(currentValue()) });
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      commit("", "stay");
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setEditing({ initial: event.key });
    }
  }

  function currentValue() {
    const rowId = rows[row]?.id;
    const columnId = columns[column]?.id;
    return rowId && columnId ? props.value(rowId, columnId) : null;
  }

  // The editor takes focus with the caret at the end.
  useEffect(() => {
    if (!editing) return;
    const input = scrollRef.current?.querySelector<HTMLInputElement>("[data-editor]");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);

  const virtualColumns = columnVirtualizer.getVirtualItems();
  const width = ROW_HEADER_WIDTH + columnVirtualizer.getTotalSize();

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-label={props["aria-label"]}
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length + 1}
      aria-readonly={!editable || undefined}
      className="bg-surface text-on-surface border-outline-variant relative w-full overflow-auto rounded-md border"
      style={{ height: props.height ?? "70dvh" }}
    >
      <div
        style={{
          height: HEADER_HEIGHT + rowVirtualizer.getTotalSize(),
          width,
          position: "relative",
        }}
      >
        <div
          role="row"
          aria-rowindex={1}
          className="bg-surface-container text-title-small border-outline-variant sticky top-0 z-20 flex border-b"
          style={{ height: HEADER_HEIGHT, width }}
        >
          <div
            role="columnheader"
            aria-colindex={1}
            className="bg-surface-container sticky left-0 z-10 flex items-center px-4"
            style={{ width: ROW_HEADER_WIDTH }}
          >
            {labels.rowHeader}
          </div>
          {virtualColumns.map((c) => (
            <div
              key={c.key}
              role="columnheader"
              aria-colindex={c.index + 2}
              className="absolute flex items-center justify-end px-3"
              style={{ left: ROW_HEADER_WIDTH + c.start, width: CELL_WIDTH, height: HEADER_HEIGHT }}
            >
              {columns[c.index]!.header}
            </div>
          ))}
        </div>
        {rowVirtualizer.getVirtualItems().map((r) => {
          const gridRow = rows[r.index]!;
          return (
            <div
              key={gridRow.id}
              role="row"
              aria-rowindex={r.index + 2}
              className="border-outline-variant absolute left-0 flex border-b"
              style={{ top: HEADER_HEIGHT + r.start, height: ROW_HEIGHT, width }}
            >
              <div
                role="rowheader"
                aria-colindex={1}
                className="bg-surface sticky left-0 z-10 flex items-center gap-1 ps-4 pe-1"
                style={{ width: ROW_HEADER_WIDTH }}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-medium truncate">{gridRow.header}</span>
                  {gridRow.subheader && (
                    <span className="text-body-small text-on-surface-variant truncate">
                      {gridRow.subheader}
                    </span>
                  )}
                </span>
                {props.rowActions?.(gridRow)}
              </div>
              {virtualColumns.map((c) => {
                const gridColumn = columns[c.index]!;
                const isActive = r.index === row && c.index === column;
                const value = props.value(gridRow.id, gridColumn.id);
                const tone = props.tone?.(gridRow.id, gridColumn.id) ?? null;
                return (
                  <div
                    key={c.key}
                    role="gridcell"
                    aria-colindex={c.index + 2}
                    aria-label={`${labels.cell(gridRow, gridColumn)}: ${props.format(value)}${
                      tone && tone !== "changed" ? `, ${labels.tone(tone)}` : ""
                    }`}
                    data-cell={`${r.index}:${c.index}`}
                    tabIndex={isActive ? 0 : -1}
                    onKeyDown={onCellKeyDown}
                    onFocus={() => {
                      if (!isActive) setActive({ row: r.index, column: c.index });
                    }}
                    onDoubleClick={() => {
                      if (editable) setEditing({ initial: props.format(value) });
                    }}
                    className={`text-body-medium focus-visible:outline-primary absolute flex items-center justify-end px-3 outline-offset-[-2px] focus-visible:outline-2 ${
                      tone ? TONE_CLASS[tone] : ""
                    }`}
                    style={{
                      left: ROW_HEADER_WIDTH + c.start,
                      width: CELL_WIDTH,
                      height: ROW_HEIGHT,
                    }}
                  >
                    {isActive && editing ? (
                      <input
                        data-editor
                        aria-label={labels.cell(gridRow, gridColumn)}
                        defaultValue={editing.initial}
                        inputMode="decimal"
                        className="text-body-medium bg-surface-container-highest h-full w-full px-2 text-end outline-none"
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          const text = event.currentTarget.value;
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commit(text, event.shiftKey ? "stay" : "down");
                          } else if (event.key === "Tab") {
                            if (commit(text, event.shiftKey ? "stay" : "right"))
                              event.preventDefault();
                          } else if (event.key === "Escape") {
                            event.preventDefault();
                            setEditing(null);
                            move(row, column);
                          }
                        }}
                        onBlur={(event) => {
                          // Leaving keeps a valid value without taking focus back.
                          if (editing && !commit(event.currentTarget.value, "none"))
                            setEditing(null);
                        }}
                      />
                    ) : (
                      props.format(value)
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
