"use client";

import { IconButton, Select, SelectItem } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { PAGE_SIZES } from "./table-state";
import type { DataTableLabels, TableState } from "./types";

/** Material 3 table footer: rows per page, the range shown, previous and next. */
export function Pagination({
  page,
  total,
  onChange,
  labels,
}: {
  page: TableState["page"];
  total: number;
  onChange: (page: TableState["page"]) => void;
  labels: DataTableLabels;
}) {
  const from = total === 0 ? 0 : page.index * page.size + 1;
  const to = Math.min(total, (page.index + 1) * page.size);

  return (
    <div className="text-body-medium text-on-surface-variant flex flex-wrap items-center justify-end gap-4 px-2 py-2">
      <Select
        className="w-24"
        label={labels.rowsPerPage}
        value={String(page.size)}
        onChange={(key) => key != null && onChange({ index: 0, size: Number(key) })}
      >
        {PAGE_SIZES.map((size) => (
          <SelectItem key={String(size)}>{String(size)}</SelectItem>
        ))}
      </Select>
      <span aria-live="polite">{labels.range(from, to, total)}</span>
      <span className="flex">
        <IconButton
          variant="standard"
          aria-label={labels.previousPage}
          icon={<Icon name="chevron_left" />}
          disabled={page.index === 0}
          onPress={() => onChange({ ...page, index: page.index - 1 })}
        />
        <IconButton
          variant="standard"
          aria-label={labels.nextPage}
          icon={<Icon name="chevron_right" />}
          disabled={to >= total}
          onPress={() => onChange({ ...page, index: page.index + 1 })}
        />
      </span>
    </div>
  );
}
