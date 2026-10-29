"use client";

import { type ReactNode, useState } from "react";
import { Button, LinearProgressIndicator } from "@windmorph/react";
import { EmptyState, Skeleton, SkeletonGroup } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ColumnSettings } from "./column-settings";
import { type CompactItem, CompactList } from "./compact-list";
import { Pagination } from "./pagination";
import { applyClientModel, initialTableState, visibleColumns } from "./table-state";
import { TableView } from "./table-view";
import { Toolbar } from "./toolbar";
import type { ColumnDef, DataTableLabels, TableState } from "./types";

export type DataTableProps<Row> = {
  "aria-label": string;
  columns: ColumnDef<Row>[];
  /** Client mode: all rows (up to a few thousand). Server mode: the current page. */
  rows: Row[];
  getRowId: (row: Row) => string;
  /** Server mode: the parent fetches pages; sorting, search and paging happen in the database. */
  mode?: "client" | "server";
  /** Server mode: rows matching the current search and filters. */
  totalRows?: number;
  /** Controlled state (with onStateChange), e.g. to fetch server pages or save views. */
  state?: TableState;
  defaultState?: Partial<TableState>;
  onStateChange?: (state: TableState) => void;
  selectable?: boolean;
  bulkActions?: (selection: TableState["selection"]) => ReactNode;
  /** Page-specific filters, shown next to the search. */
  filters?: ReactNode;
  onRowAction?: (row: Row) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  empty?: ReactNode;
  /** The list item for each row on phones (below 600px). */
  compactItem: (row: Row) => CompactItem;
  labels: DataTableLabels;
};

/**
 * Material 3 data table on React Aria: sorting, resizing, selection with a bulk bar, search,
 * pagination, column settings, and a list layout on phones. Holds one page of rows at a time; see
 * the data-table-and-grid design for the measured limits.
 */
export function DataTable<Row>(props: DataTableProps<Row>) {
  const { columns, rows, getRowId, mode = "client", labels, selectable = false } = props;
  const [ownState, setOwnState] = useState(() => initialTableState(columns, props.defaultState));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const phone = useMediaQuery("(max-width: 599px)");

  const state = props.state ?? ownState;
  const setState = (next: TableState) => {
    if (!props.state) setOwnState(next);
    props.onStateChange?.(next);
  };
  const update = (patch: Partial<TableState>) => setState({ ...state, ...patch });
  const clearSelection = { selection: { ids: [], allMatching: false } };

  const shown = visibleColumns(columns, state);
  const { pageRows, total } =
    mode === "server"
      ? { pageRows: rows, total: props.totalRows ?? rows.length }
      : applyClientModel(rows, columns, state);

  let body: ReactNode;
  if (props.error) {
    body = (
      <EmptyState
        color="error"
        icon={<Icon name="error" />}
        title={props.error}
        actions={
          props.onRetry && (
            <Button variant="tonal" onPress={props.onRetry}>
              {labels.retry}
            </Button>
          )
        }
      />
    );
  } else if (props.loading && pageRows.length === 0) {
    body = (
      <SkeletonGroup label={labels.loading}>
        <div className="flex flex-col gap-2 py-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </SkeletonGroup>
    );
  } else if (total === 0) {
    body = props.empty;
  } else if (phone) {
    body = (
      <CompactList
        ariaLabel={props["aria-label"]}
        rows={pageRows}
        getRowId={getRowId}
        toItem={props.compactItem}
        onRowAction={props.onRowAction}
      />
    );
  } else {
    body = (
      <TableView
        ariaLabel={props["aria-label"]}
        columns={shown}
        rows={pageRows}
        getRowId={getRowId}
        state={state}
        selectable={selectable}
        onSortChange={(sort) => update({ sort, page: { ...state.page, index: 0 } })}
        onSelectionChange={(ids) => update({ selection: { ids, allMatching: false } })}
        onResize={(widths) => update({ widths: { ...state.widths, ...widths } })}
        onRowAction={props.onRowAction}
        labels={labels}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Toolbar
        state={state}
        total={total}
        pageCount={pageRows.length}
        serverMode={mode === "server"}
        filters={props.filters}
        bulkActions={props.bulkActions?.(state.selection)}
        onSearch={(search) =>
          update({ search, page: { ...state.page, index: 0 }, ...clearSelection })
        }
        onSelectAllMatching={() =>
          update({ selection: { ids: state.selection.ids, allMatching: true } })
        }
        onClearSelection={() => update(clearSelection)}
        onOpenColumns={() => setColumnsOpen(true)}
        labels={labels}
      />
      <div className="relative">
        {props.loading && pageRows.length > 0 && (
          <LinearProgressIndicator
            aria-label={labels.loading}
            className="absolute inset-x-0 top-0 z-20"
          />
        )}
        {body}
      </div>
      {total > 0 && !props.error && (
        <Pagination
          page={state.page}
          total={total}
          onChange={(page) => update({ page, ...clearSelection })}
          labels={labels}
        />
      )}
      {columnsOpen && (
        <ColumnSettings
          columns={columns}
          state={state}
          onChange={update}
          onReset={() => update({ columnOrder: columns.map((c) => c.id), hidden: [], widths: {} })}
          onClose={() => setColumnsOpen(false)}
          labels={labels}
        />
      )}
    </div>
  );
}
