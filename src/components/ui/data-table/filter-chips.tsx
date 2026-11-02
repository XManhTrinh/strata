"use client";

import { useFormatter } from "next-intl";
import { Button, InputChip } from "@windmorph/react";
import { isActiveFilter } from "./table-state";
import type { ColumnDef, DataTableLabels, FilterValue } from "./types";

/** A filter the page keeps itself (such as a quick filter beside the search), shown as a chip. */
export type ExtraChip = { key: string; label: string; onRemove: () => void };

/** Active filters as removable chips (press one to change it), and "Clear all". */
export function FilterChips<Row>({
  columns,
  filters,
  extra = [],
  onEdit,
  onRemove,
  onClearAll,
  labels,
}: {
  columns: ColumnDef<Row>[];
  filters: Record<string, FilterValue>;
  extra?: ExtraChip[];
  onEdit: (columnId: string) => void;
  onRemove: (columnId: string) => void;
  onClearAll: () => void;
  labels: DataTableLabels;
}) {
  const format = useFormatter();
  const day = (iso: string | undefined) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" }) : "";

  const chips = columns.flatMap((column) => {
    const value = filters[column.id];
    if (!isActiveFilter(value)) return [];
    let text: string;
    if ("contains" in value) text = labels.chipContains(column.header, value.contains);
    else if ("in" in value) {
      const options = column.filter?.kind === "choice" ? column.filter.options : [];
      text = labels.chipChoice(
        column.header,
        value.in.map((id) => options.find((o) => o.id === id)?.label ?? id).join(", ")
      );
    } else if (value.from && value.to) {
      text = labels.chipRange(column.header, day(value.from), day(value.to));
    } else if (value.from) text = labels.chipFrom(column.header, day(value.from));
    else text = labels.chipUntil(column.header, day(value.to));
    return [{ id: column.id, text }];
  });
  if (chips.length + extra.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={labels.activeFilters}
      className="flex flex-wrap items-center gap-2"
    >
      {extra.map((chip) => (
        <InputChip
          key={chip.key}
          onRemove={chip.onRemove}
          labels={{ remove: labels.removeFilter(chip.label) }}
        >
          {chip.label}
        </InputChip>
      ))}
      {chips.map((chip) => (
        <InputChip
          key={chip.id}
          onPress={() => onEdit(chip.id)}
          onRemove={() => onRemove(chip.id)}
          aria-label={labels.editFilter(chip.text)}
          labels={{ remove: labels.removeFilter(chip.text) }}
        >
          {chip.text}
        </InputChip>
      ))}
      <Button variant="text" onPress={onClearAll}>
        {labels.clearAll}
      </Button>
    </div>
  );
}
