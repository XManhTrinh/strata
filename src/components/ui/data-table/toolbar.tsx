"use client";

import { type ReactNode, useState } from "react";
import { Button, IconButton, TextField } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { DataTableLabels, TableState } from "./types";

/** Search, page-specific filters and column settings; replaced by the bulk bar while rows are selected. */
export function Toolbar({
  state,
  total,
  pageCount,
  serverMode,
  filters,
  bulkActions,
  onSearch,
  onSelectAllMatching,
  onClearSelection,
  onOpenColumns,
  labels,
}: {
  state: TableState;
  total: number;
  pageCount: number;
  serverMode: boolean;
  filters?: ReactNode;
  bulkActions?: ReactNode;
  onSearch: (search: string) => void;
  onSelectAllMatching: () => void;
  onClearSelection: () => void;
  onOpenColumns: () => void;
  labels: DataTableLabels;
}) {
  const selected = state.selection.allMatching ? total : state.selection.ids.length;
  // Phones show a list, so columns don't apply, and filters wait behind a button.
  const phone = useMediaQuery("(max-width: 599px)");
  const [filtersOpen, setFiltersOpen] = useState(false);

  if (selected > 0) {
    return (
      <div
        role="toolbar"
        aria-label={labels.selected(selected)}
        className="bg-secondary-container text-on-secondary-container flex min-h-16 flex-wrap items-center gap-2 rounded-xl px-4 py-2"
      >
        <IconButton
          variant="standard"
          aria-label={labels.clearSelection}
          icon={<Icon name="close" />}
          onPress={onClearSelection}
        />
        <span className="text-title-medium">{labels.selected(selected)}</span>
        {serverMode &&
          !state.selection.allMatching &&
          state.selection.ids.length === pageCount &&
          total > pageCount && (
            <Button variant="text" onPress={onSelectAllMatching}>
              {labels.selectAllMatching(total)}
            </Button>
          )}
        <span className="ms-auto flex flex-wrap gap-2">{bulkActions}</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-16 flex-wrap items-center gap-3">
      <TextField
        className="medium:w-80 w-full"
        type="search"
        aria-label={labels.search}
        placeholder={labels.search}
        leadingIcon={<Icon name="search" />}
        value={state.search}
        onChange={onSearch}
      />
      {filters && phone && (
        <IconButton
          variant="standard"
          className="ms-auto"
          aria-label={labels.filters}
          aria-expanded={filtersOpen}
          icon={<Icon name="filter_list" />}
          onPress={() => setFiltersOpen(!filtersOpen)}
        />
      )}
      {filters && (!phone || filtersOpen) && (
        <div className="medium:contents flex w-full flex-wrap gap-3">{filters}</div>
      )}
      {!phone && (
        <IconButton
          variant="standard"
          className="ms-auto"
          aria-label={labels.columns}
          icon={<Icon name="view_column" />}
          onPress={onOpenColumns}
        />
      )}
    </div>
  );
}
