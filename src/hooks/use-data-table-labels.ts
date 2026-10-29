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
