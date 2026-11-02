"use client";

import {
  Cell,
  Column,
  ColumnResizer,
  type Key,
  ResizableTableContainer,
  Row,
  type Selection,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import { cn } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { SelectionCheckbox } from "./selection-checkbox";
import { type PinPlace, nextSort, pinPlaces } from "./table-state";
import type { ColumnDef, DataTableLabels, TableState } from "./types";

type Props<Row> = {
  ariaLabel: string;
  columns: ColumnDef<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string;
  state: TableState;
  selectable: boolean;
  onSortChange: (sort: TableState["sort"]) => void;
  onSelectionChange: (ids: string[], wholePage: boolean) => void;
  onResize: (widths: Record<string, number>) => void;
  onRowAction?: (row: Row) => void;
  rowHref?: (row: Row) => string;
  labels: DataTableLabels;
};

const SELECT_COLUMN = "__select";
const SELECT_WIDTH = 56;
const SHADOW = "color-mix(in srgb, var(--md-sys-color-shadow) 25%, transparent)";

/** A pinned cell sticks to its edge and, innermost and with content under it, casts a shadow. */
function pinStyle(place: PinPlace | undefined, scrolled: { start: boolean; end: boolean }) {
  if (!place) return undefined;
  const style: CSSProperties = { position: "sticky" };
  if (place.side === "start") style.insetInlineStart = place.offset;
  else style.insetInlineEnd = place.offset;
  if (place.edge && scrolled[place.side]) {
    style.boxShadow =
      place.side === "start" ? `4px 0 4px -2px ${SHADOW}` : `-4px 0 4px -2px ${SHADOW}`;
  }
  return style;
}

/** Pinned body cells cover what scrolls under them, in the row's own colour (hover, selected). */
const PINNED_CELL =
  "z-[1] bg-surface group-hover/row:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,var(--md-sys-color-surface))] group-data-[selected]/row:bg-secondary-container";
const PINNED_HEADER = "z-[2] bg-surface-container";

function display<Row>(column: ColumnDef<Row>, row: Row) {
  if (column.cell) return column.cell(row);
  const value = column.accessor(row);
  return value === null || value === "" ? "—" : String(value);
}

export function TableView<Row>({
  ariaLabel,
  columns,
  rows,
  getRowId,
  state,
  selectable,
  onSortChange,
  onSelectionChange,
  onResize,
  onRowAction,
  rowHref,
  labels,
}: Props<Row>) {
  const selectedKeys: Selection = new Set(state.selection.ids);
  const places = pinPlaces(columns, state, selectable ? SELECT_WIDTH : 0);
  // With columns pinned at the start, the selection column sticks too, at the very edge.
  const selectPlace: PinPlace | undefined =
    selectable && state.pinned.start.length > 0
      ? { side: "start", offset: 0, edge: false }
      : undefined;
  // Whether content has scrolled under the pinned columns, for their shadow.
  const container = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState({ start: false, end: false });
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      const left = Math.abs(element.scrollLeft);
      setScrolled({
        start: left > 0,
        end: left + element.clientWidth < element.scrollWidth - 1,
      });
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      element.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [columns]);
  // Shift held while pressing a header adds that column to the sort (read when the press starts).
  const adding = useRef(false);
  useEffect(() => {
    const remember = (event: PointerEvent | KeyboardEvent) => {
      adding.current = event.shiftKey;
    };
    document.addEventListener("pointerdown", remember, true);
    document.addEventListener("keydown", remember, true);
    return () => {
      document.removeEventListener("pointerdown", remember, true);
      document.removeEventListener("keydown", remember, true);
    };
  }, []);
  const byId = new Map(rows.map((row) => [getRowId(row), row]));

  return (
    <ResizableTableContainer
      ref={container}
      className="relative w-full overflow-auto"
      onResizeEnd={(widths: Map<Key, number | string>) =>
        onResize(
          Object.fromEntries(
            [...widths].flatMap(([key, width]) =>
              typeof width === "number" ? [[String(key), width]] : []
            )
          )
        )
      }
    >
      <Table
        aria-label={ariaLabel}
        selectionMode={selectable ? "multiple" : "none"}
        selectionBehavior="toggle"
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => {
          const ids = keys === "all" ? rows.map(getRowId) : [...keys].map(String);
          onSelectionChange(ids, keys === "all");
        }}
        // React Aria marks the first level (aria-sort); the levels after it show in the headers.
        sortDescriptor={state.sort[0]}
        onSortChange={(sort) =>
          onSortChange(nextSort(state.sort, String(sort.column), adding.current))
        }
        onRowAction={
          onRowAction
            ? (key) => byId.has(String(key)) && onRowAction(byId.get(String(key))!)
            : undefined
        }
        className="text-body-medium text-on-surface w-full border-separate border-spacing-0"
      >
        <TableHeader className="bg-surface-container text-title-small text-on-surface-variant sticky top-0 z-10">
          {selectable && (
            <Column
              id={SELECT_COLUMN}
              width={SELECT_WIDTH}
              minWidth={SELECT_WIDTH}
              className={cn("border-outline-variant border-b px-2", selectPlace && PINNED_HEADER)}
              style={pinStyle(selectPlace, scrolled)}
            >
              <SelectionCheckbox aria-label={labels.selectAll} />
            </Column>
          )}
          {columns.map((column, index) => {
            // The table spans the page: growing columns share the spare width (a width someone
            // set by hand stays as set); with none, the last column fills the rest. The last
            // column has no resize handle or separator, with nothing after it.
            const last = index === columns.length - 1;
            const resized = state.widths[column.id];
            const width = resized ?? column.width ?? 180;
            // A pinned column keeps its width, so the columns after it know where to stick.
            const place = places.get(column.id);
            const grows = !place && resized === undefined && column.grow === true;
            const fills =
              !place && last && !columns.some((c) => c.grow && state.widths[c.id] === undefined);
            return (
              <Column
                key={column.id}
                id={column.id}
                isRowHeader={column.isRowHeader}
                allowsSorting={column.sortable !== false}
                defaultWidth={grows ? `${width}fr` : fills ? "1fr" : width}
                minWidth={
                  grows || fills ? Math.max(width, column.minWidth ?? 80) : (column.minWidth ?? 80)
                }
                className={cn(
                  "border-outline-variant group relative h-14 border-b px-4 text-start outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-secondary data-[focus-visible]:ring-inset",
                  column.sortable !== false && "cursor-pointer",
                  place && PINNED_HEADER
                )}
                style={pinStyle(place, scrolled)}
              >
                {({ allowsSorting }) => {
                  const level = state.sort.findIndex((s) => s.column === column.id);
                  const sortDirection = level >= 0 ? state.sort[level]!.direction : undefined;
                  return (
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        column.align === "end" && "justify-end"
                      )}
                    >
                      <span className="truncate">{column.header}</span>
                      {allowsSorting && (
                        <Icon
                          name={sortDirection === "descending" ? "arrow_downward" : "arrow_upward"}
                          size={18}
                          className={cn(
                            sortDirection ? "text-on-surface" : "opacity-0 group-hover:opacity-60"
                          )}
                        />
                      )}
                      {sortDirection && state.sort.length > 1 && (
                        <span
                          className="text-label-small text-on-surface-variant"
                          aria-label={labels.sortLevel(level + 1)}
                        >
                          {level + 1}
                        </span>
                      )}
                      {!last && (
                        <ColumnResizer className="bg-outline-variant hover:bg-primary data-[resizing]:bg-primary absolute end-0 top-3 bottom-3 w-0.5 cursor-col-resize outline-none" />
                      )}
                    </div>
                  );
                }}
              </Column>
            );
          })}
        </TableHeader>
        {/* React Aria caches rendered rows per item; re-render them when the columns change. */}
        <TableBody items={rows} dependencies={[columns, selectable]}>
          {(row) => {
            const id = getRowId(row);
            return (
              <Row
                id={id}
                href={rowHref?.(row) || undefined}
                className={cn(
                  "group/row border-outline-variant outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-secondary data-[focus-visible]:ring-inset",
                  "hover:bg-on-surface/8 data-[selected]:bg-secondary-container data-[selected]:text-on-secondary-container",
                  (onRowAction || rowHref) && "cursor-pointer"
                )}
              >
                {selectable && (
                  <Cell
                    className={cn(
                      "border-outline-variant border-b px-2",
                      selectPlace && PINNED_CELL
                    )}
                    style={pinStyle(selectPlace, scrolled)}
                  >
                    <SelectionCheckbox aria-label={labels.selectRow} />
                  </Cell>
                )}
                {columns.map((column) => (
                  <Cell
                    key={column.id}
                    className={cn(
                      "border-outline-variant h-[52px] truncate border-b px-4",
                      (column.align === "end" ||
                        column.type === "number" ||
                        column.type === "currency") &&
                        "text-end tabular-nums",
                      places.has(column.id) && PINNED_CELL
                    )}
                    style={pinStyle(places.get(column.id), scrolled)}
                  >
                    {rowHref && column.isRowHeader ? (
                      // A real link, so a click works before the script loads; once it has, the
                      // row navigates (client-side) and this link stays out of the way.
                      <a
                        href={rowHref(row)}
                        tabIndex={-1}
                        className="text-inherit no-underline"
                        onClick={(event) => event.preventDefault()}
                      >
                        {display(column, row)}
                      </a>
                    ) : (
                      display(column, row)
                    )}
                  </Cell>
                ))}
              </Row>
            );
          }}
        </TableBody>
      </Table>
    </ResizableTableContainer>
  );
}
