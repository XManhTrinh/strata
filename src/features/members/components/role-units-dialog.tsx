"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@windmorph/react";
import { useSnackbar } from "@/lib/snackbar";
import { setRoleUnits } from "../actions";

type Unit = { id: string; label: string };

/** Chooses the units one role assignment covers (each unit includes everything under it). */
export function RoleUnitsDialog({
  personName,
  roleName,
  assignmentId,
  unitIds,
  units,
  onClose,
}: {
  personName: string;
  roleName: string;
  assignmentId: string;
  unitIds: string[];
  units: Unit[];
  onClose: () => void;
}) {
  const t = useTranslations("members");
  const te = useTranslations("errors");
  const snackbar = useSnackbar();
  const [chosen, setChosen] = useState<string[]>(unitIds);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await setRoleUnits(assignmentId, chosen);
      void snackbar.showSnackbar(result.ok ? t("unitsSaved") : te(result.error), { replace: true });
      if (result.ok) onClose();
    });
  }

  return (
    <Dialog role="dialog" open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{t("unitsTitle", { role: roleName })}</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        <p className="text-body-medium text-on-surface-variant">
          {t("unitsBody", { name: personName })}
        </p>
        <Autocomplete
          className="w-full"
          label={t("unitsLabel")}
          selectionMode="multiple"
          defaultItems={units}
          value={chosen}
          inputValue={search}
          onInputChange={setSearch}
          // Clearing the search after each pick: leftover text would clear the choice on blur.
          onChange={(keys) => {
            setChosen(Array.from(keys as Iterable<string | number>, String));
            setSearch("");
          }}
        >
          {(unit) => (
            <AutocompleteItem key={unit.id} textValue={unit.label}>
              {unit.label}
            </AutocompleteItem>
          )}
        </Autocomplete>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onClose}>
          {t("cancel")}
        </Button>
        <Button variant="text" pending={pending} onPress={save}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
