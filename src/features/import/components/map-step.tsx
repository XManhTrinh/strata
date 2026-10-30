"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Radio, RadioGroup, Select, SelectItem, Switch, TextField } from "@windmorph/react";
import { Alert } from "@windmorph/react-pro";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { useSnackbar } from "@/lib/snackbar";
import { saveMapping } from "../client-api";
import { type DateFormat, IMPORT_FIELDS, type ImportField, type ImportMapping } from "../mapping";
import type { ImportOptions, SavedMapping } from "../types";

const NONE = "__none__";

/** Which column feeds which field, the key, the hierarchy levels and how the import applies. */
export function MapStep({
  workspaceId,
  headers,
  mapping,
  options,
  levels,
  customFields,
  saved,
  error,
  pending,
  onChange,
  onOptions,
  onBack,
  onNext,
}: {
  workspaceId: string;
  headers: string[];
  mapping: ImportMapping;
  options: ImportOptions;
  levels: { id: string; name: string }[];
  customFields: { key: string; label: string }[];
  saved: SavedMapping[];
  error: string | null;
  pending: string | null;
  onChange: (mapping: ImportMapping) => void;
  onOptions: (options: ImportOptions) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("import");
  const snackbar = useSnackbar();
  const [name, setName] = useState("");

  const column = (
    label: string,
    value: string | undefined,
    set: (column: string | undefined) => void
  ) => (
    <Select
      className="w-full"
      label={label}
      value={value && headers.includes(value) ? value : NONE}
      onChange={(key) => key != null && set(key === NONE ? undefined : String(key))}
    >
      {[NONE, ...headers].map((h) => (
        <SelectItem key={h} textValue={h === NONE ? t("map.notInFile") : h}>
          {h === NONE ? t("map.notInFile") : h}
        </SelectItem>
      ))}
    </Select>
  );
  const setField = (field: ImportField) => (value: string | undefined) =>
    onChange({ ...mapping, columns: { ...mapping.columns, [field]: value } });
  const unitColumn = (levelId: string) => mapping.units.find((u) => u.levelId === levelId)?.column;
  const setUnit = (levelId: string, value: string | undefined) =>
    onChange({
      ...mapping,
      // Kept in level order, top first, as import_jobs.unit_level_ids expects.
      units: levels.flatMap((l) => {
        const c = l.id === levelId ? value : unitColumn(l.id);
        return c ? [{ column: c, levelId: l.id }] : [];
      }),
    });

  return (
    <div className="flex flex-col gap-6">
      {saved.length > 0 && (
        <Select
          className="medium:w-80 w-full"
          label={t("map.savedMappings")}
          onChange={(key) => {
            const found = saved.find((s) => s.id === key);
            if (found) onChange(found.mapping);
          }}
        >
          {saved.map((s) => (
            <SelectItem key={s.id}>{s.name}</SelectItem>
          ))}
        </Select>
      )}

      <RadioGroup
        label={t("map.key")}
        value={mapping.keyField}
        onChange={(value) => onChange({ ...mapping, keyField: value as ImportMapping["keyField"] })}
      >
        <Radio value="person_key">{t("map.keys.person_key")}</Radio>
        <Radio value="email">{t("map.keys.email")}</Radio>
      </RadioGroup>
      <p className="text-body-small text-on-surface-variant -mt-4">{t("map.keyHelp")}</p>

      <section className="flex flex-col gap-3">
        <h2 className="text-title-medium text-on-surface">{t("map.fieldsTitle")}</h2>
        <div className="medium:grid-cols-2 expanded:grid-cols-3 grid gap-4">
          {IMPORT_FIELDS.map((field) => (
            <div key={field}>
              {column(t(`fields.${field}`), mapping.columns[field], setField(field))}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title-medium text-on-surface">{t("map.unitsTitle")}</h2>
        <p className="text-body-medium text-on-surface-variant">
          {levels.length ? t("map.unitsHelp") : t("map.noLevels")}
        </p>
        <div className="medium:grid-cols-2 expanded:grid-cols-3 grid gap-4">
          {levels.map((level) => (
            <div key={level.id}>
              {column(level.name, unitColumn(level.id), (value) => setUnit(level.id, value))}
            </div>
          ))}
        </div>
      </section>

      {customFields.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title-medium text-on-surface">{t("map.customTitle")}</h2>
          <div className="medium:grid-cols-2 expanded:grid-cols-3 grid gap-4">
            {customFields.map((f) => (
              <div key={f.key}>
                {column(f.label, mapping.custom[f.key], (value) =>
                  onChange({
                    ...mapping,
                    custom: Object.fromEntries(
                      Object.entries({ ...mapping.custom, [f.key]: value }).filter(([, v]) => v)
                    ) as Record<string, string>,
                  })
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="medium:grid-cols-2 grid gap-4">
        <Select
          className="w-full"
          label={t("map.dateFormat")}
          value={mapping.dateFormat}
          onChange={(key) => key != null && onChange({ ...mapping, dateFormat: key as DateFormat })}
        >
          {(["iso", "dmy", "mdy"] as const).map((f) => (
            <SelectItem key={f}>{t(`map.dateFormats.${f}`)}</SelectItem>
          ))}
        </Select>
        <IsoDateField
          name="effectiveDate"
          label={t("map.effectiveDate")}
          defaultValue={options.effectiveDate}
          onChange={(date) => date && onOptions({ ...options, effectiveDate: date })}
        />
        <div className="medium:col-span-2 flex flex-col gap-1">
          <Switch
            checked={options.markLeavers}
            onCheckedChange={(on) => onOptions({ ...options, markLeavers: on })}
          >
            {t("map.markLeavers")}
          </Switch>
          <span className="text-body-small text-on-surface-variant">
            {t("map.markLeaversHelp")}
          </span>
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <TextField
          className="medium:w-64 w-full"
          label={t("map.saveAs")}
          value={name}
          onChange={setName}
        />
        <Button
          variant="text"
          disabled={!name.trim()}
          onPress={async () => {
            await saveMapping(workspaceId, name.trim(), mapping);
            void snackbar.showSnackbar(t("map.saved"), { replace: true });
          }}
        >
          {t("map.save")}
        </Button>
      </div>

      {error && <Alert severity="error">{error}</Alert>}
      {pending && <p className="text-body-medium text-on-surface-variant">{pending}</p>}

      <div className="flex justify-between gap-3">
        <Button variant="text" onPress={onBack}>
          {t("map.back")}
        </Button>
        <Button variant="filled" pending={Boolean(pending)} onPress={onNext}>
          {t("map.next")}
        </Button>
      </div>
    </div>
  );
}
