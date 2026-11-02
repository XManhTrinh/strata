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
import { SelectionCheckbox } from "./selection-checkbox";
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
  const byId = new Map(rows.map((row) => [getRowId(row), row]));

  return (
    <ResizableTableContainer
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
        sortDescriptor={
          state.sort ? { column: state.sort.column, direction: state.sort.direction } : undefined
        }
        onSortChange={(sort) =>
          onSortChange({ column: String(sort.column), direction: sort.direction })
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
              width={56}
              minWidth={56}
              className="border-outline-variant border-b px-2"
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
            const grows = resized === undefined && column.grow === true;
            const fills = last && !columns.some((c) => c.grow && state.widths[c.id] === undefined);
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
                  column.sortable !== false && "cursor-pointer"
                )}
              >
                {({ sortDirection, allowsSorting }) => (
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
                    {!last && (
                      <ColumnResizer className="bg-outline-variant hover:bg-primary data-[resizing]:bg-primary absolute end-0 top-3 bottom-3 w-0.5 cursor-col-resize outline-none" />
                    )}
                  </div>
                )}
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
                  "border-outline-variant outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-secondary data-[focus-visible]:ring-inset",
                  "hover:bg-on-surface/8 data-[selected]:bg-secondary-container data-[selected]:text-on-secondary-container",
                  (onRowAction || rowHref) && "cursor-pointer"
                )}
              >
                {selectable && (
                  <Cell className="border-outline-variant border-b px-2">
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
                        "text-end tabular-nums"
                    )}
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
