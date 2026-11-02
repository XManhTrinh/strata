"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  SelectItem,
  TextField,
} from "@windmorph/react";
import { FORM_DIALOG_CLASSES } from "@/components/ui/form-dialog";
import { IsoDateField } from "@/components/ui/iso-date-field";
import type { ColumnDef, DataTableLabels, FilterValue } from "./types";

/**
 * One column's filter: text it contains, a date range, or values chosen from a list. Applying an
 * empty filter removes it.
 */
export function FilterDialog<Row>({
  column,
  value,
  onApply,
  onClose,
  labels,
}: {
  column: ColumnDef<Row>;
  value: FilterValue | undefined;
  onApply: (value: FilterValue | null) => void;
  onClose: () => void;
  labels: DataTableLabels;
}) {
  const filter = column.filter;
  const [contains, setContains] = useState(value && "contains" in value ? value.contains : "");
  const [from, setFrom] = useState(value && "from" in value ? (value.from ?? null) : null);
  const [to, setTo] = useState(value && "to" in value ? (value.to ?? null) : null);
  const [chosen, setChosen] = useState<string[]>(value && "in" in value ? value.in : []);
  if (!filter) return null;

  function apply() {
    if (filter!.kind === "text") onApply(contains.trim() ? { contains: contains.trim() } : null);
    else if (filter!.kind === "date")
      onApply(from || to ? { ...(from && { from }), ...(to && { to }) } : null);
    else onApply(chosen.length > 0 ? { in: chosen } : null);
  }

  return (
    <Dialog
      role="dialog"
      open
      onOpenChange={(open) => !open && onClose()}
      classNames={FORM_DIALOG_CLASSES}
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <DialogTitle>{labels.filterBy(column.header)}</DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-2">
          {filter.kind === "text" && (
            <TextField
              className="w-full"
              label={labels.contains}
              value={contains}
              onChange={setContains}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's only field
              autoFocus
            />
          )}
          {filter.kind === "date" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <IsoDateField
                name="from"
                label={labels.from}
                defaultValue={from}
                onChange={setFrom}
              />
              <IsoDateField name="to" label={labels.to} defaultValue={to} onChange={setTo} />
            </div>
          )}
          {filter.kind === "choice" && (
            <Select<object, "multiple">
              className="w-full"
              label={column.header}
              selectionMode="multiple"
              searchable={filter.options.length > 7}
              labels={{ search: column.header }}
              value={chosen}
              onChange={(keys) => setChosen(keys.map(String))}
            >
              {filter.options.map((option) => (
                <SelectItem key={option.id} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onPress={() => onApply(null)}>
            {labels.clear}
          </Button>
          <Button variant="text" onPress={onClose}>
            {labels.cancel}
          </Button>
          <Button type="submit" variant="text">
            {labels.apply}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
