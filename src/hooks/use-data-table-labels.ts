"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { DataTableLabels } from "@/components/ui/data-table";

/** DataTable's built-in text, from the translation files. */
export function useDataTableLabels(): DataTableLabels {
  const t = useTranslations("dataTable");
  const format = useFormatter();
  return useMemo(
    () => ({
      search: t("search"),
      filters: t("filters"),
      columns: t("columns"),
      columnSettingsTitle: t("columnSettingsTitle"),
      showColumn: (column) => t("showColumn", { column }),
      moveUp: (column) => t("moveUp", { column }),
      moveDown: (column) => t("moveDown", { column }),
      reset: t("reset"),
      done: t("done"),
      selectAll: t("selectAll"),
      selectRow: t("selectRow"),
      selected: (count) => t("selected", { count }),
      selectAllMatching: (count) => t("selectAllMatching", { count: format.number(count) }),
      clearSelection: t("clearSelection"),
      rowsPerPage: t("rowsPerPage"),
      pinMenu: (column: string) => t("pinMenu", { column }),
      filter: t("filter"),
      filterBy: (column: string) => t("filterBy", { column }),
      contains: t("contains"),
      from: t("from"),
      to: t("to"),
      apply: t("apply"),
      clear: t("clear"),
      cancel: t("cancel"),
      clearAll: t("clearAll"),
      activeFilters: t("activeFilters"),
      chipContains: (column: string, text: string) => t("chipContains", { column, text }),
      chipRange: (column: string, from: string, to: string) => t("chipRange", { column, from, to }),
      chipFrom: (column: string, from: string) => t("chipFrom", { column, from }),
      chipUntil: (column: string, to: string) => t("chipUntil", { column, to }),
      chipChoice: (column: string, values: string) => t("chipChoice", { column, values }),
      editFilter: (filter: string) => t("editFilter", { filter }),
      removeFilter: (filter: string) => t("removeFilter", { filter }),
      pinStart: t("pinStart"),
      pinEnd: t("pinEnd"),
      unpin: t("unpin"),
      pinnedStart: t("pinnedStart"),
      pinnedEnd: t("pinnedEnd"),
      sortLevel: (level: number) => t("sortLevel", { level }),
      range: (from, to, total) =>
        t("range", {
          from: format.number(from),
          to: format.number(to),
          total: format.number(total),
        }),
      previousPage: t("previousPage"),
      nextPage: t("nextPage"),
      loading: t("loading"),
      retry: t("retry"),
    }),
    [t, format]
  );
}
