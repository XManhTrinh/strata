"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Alert } from "@windmorph/react-pro";
import { FormError } from "@/features/auth/components/form-error";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { idleFormState } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { useFormAction } from "@/lib/use-form-action";
import { saveUnit } from "../actions";
import { allowedLevels, subtreeIds, unitPath } from "../hierarchy";
import type { OrgLevel, OrgUnit } from "../types";

/** Adds a unit under `parentId`, or edits `unit`: name, code, level and where it sits. */
export function UnitDialog({
  unit,
  parentId: initialParentId,
  levels,
  units,
  onClose,
}: {
  unit?: OrgUnit;
  parentId?: string;
  levels: OrgLevel[];
  units: OrgUnit[];
  onClose: () => void;
}) {
  const t = useTranslations("hierarchy");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [state, onSubmit, pending] = useFormAction(
    saveUnit.bind(null, workspace.id, unit?.id ?? null),
    idleFormState
  );
  const [name, setName] = useState(unit?.name ?? "");
  const [parentId, setParentId] = useState(unit?.parentId ?? initialParentId ?? "");
  const [levelId, setLevelId] = useState(unit?.levelId ?? "");
  const fieldErrors = state.fieldErrors ?? {};

  // A unit can't sit under itself, its own sub-units or an archived unit.
  const parents = useMemo(() => {
    const own = unit ? subtreeIds(units, unit.id) : new Set<string>();
    return units
      .filter((u) => !u.archived && !own.has(u.id))
      .map((u) => ({ id: u.id, path: unitPath(units, u.id) }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [unit, units]);
  const levelOptions = allowedLevels(levels, units, parentId || null, unit?.id ?? null);
  const parentName = units.find((u) => u.id === parentId)?.name ?? "";

  useEffect(() => {
    if (state.status !== "success") return;
    void snackbar.showSnackbar(t(unit ? "units.saved" : "units.added", { name }), {
      replace: true,
    });
    onClose();
  }, [state, unit, name, onClose, snackbar, t]);

  return (
    <Dialog role="dialog" open onOpenChange={(open) => !open && onClose()}>
      <form onSubmit={onSubmit} noValidate className="contents">
        <DialogTitle>{t(unit ? "units.dialogEdit" : "units.dialogAdd")}</DialogTitle>
        <DialogContent className="flex flex-col gap-4">
          <FormError error={state.error} />
          <TextField
            className="w-full"
            name="name"
            label={t("units.name")}
            required
            value={name}
            onChange={setName}
            invalid={Boolean(fieldErrors.name)}
            errorMessage={fieldErrors.name && te(fieldErrors.name)}
          />
          <TextField
            className="w-full"
            name="code"
            label={t("units.code")}
            supportingText={t("units.codeHelp")}
            defaultValue={unit?.code ?? ""}
            invalid={Boolean(fieldErrors.code)}
            errorMessage={fieldErrors.code && te(fieldErrors.code)}
          />
          <Select
            className="w-full"
            name="parentId"
            label={t("units.parent")}
            searchable
            labels={{ search: t("units.parent") }}
            value={parentId}
            onChange={(key) => key != null && setParentId(String(key))}
            invalid={Boolean(fieldErrors.parentId)}
            errorMessage={fieldErrors.parentId && te(fieldErrors.parentId)}
          >
            {parents.map((p) => (
              <SelectItem key={p.id}>{p.path}</SelectItem>
            ))}
          </Select>
          {levelOptions.length === 0 ? (
            <Alert severity="info">{t("units.noLevels", { parent: parentName })}</Alert>
          ) : (
            <Select
              className="w-full"
              name="levelId"
              label={t("units.level")}
              value={levelOptions.some((l) => l.id === levelId) ? levelId : null}
              onChange={(key) => key != null && setLevelId(String(key))}
              invalid={Boolean(fieldErrors.levelId)}
              errorMessage={fieldErrors.levelId && te(fieldErrors.levelId)}
            >
              {levelOptions.map((l) => (
                <SelectItem key={l.id}>{l.name}</SelectItem>
              ))}
            </Select>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onPress={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            variant="text"
            pending={pending}
            disabled={levelOptions.length === 0}
          >
            {t(unit ? "save" : "add")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
