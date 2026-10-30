"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Select, SelectItem, Switch, TextField } from "@windmorph/react";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { saveCustomField } from "../field-actions";
import type { CustomField, CustomFieldType } from "../types";
import { FormDialog } from "@/components/ui/form-dialog";

const TYPES: CustomFieldType[] = [
  "text",
  "number",
  "date",
  "single_choice",
  "multi_choice",
  "person",
];
const FLAGS = ["sensitive", "required", "keepHistory"] as const;

/** "Capex or Opex" → "capex_or_opex": a key suggested from the label. */
function keyFrom(label: string): string {
  const key = label
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+|_+$/g, "");
  return key.slice(0, 60);
}

/** Adds a custom field or edits `field`; the key is set once, when the field is added. */
export function FieldDialog({ field, onClose }: { field?: CustomField; onClose: () => void }) {
  const t = useTranslations("fields");
  const { workspace } = useWorkspace();
  const [label, setLabel] = useState(field?.name ?? "");
  const [key, setKey] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(field?.type ?? null);
  const [flags, setFlags] = useState({
    sensitive: field?.sensitive ?? false,
    required: field?.required ?? false,
    keepHistory: field?.keepHistory ?? false,
  });

  return (
    <FormDialog
      title={t(field ? "dialogEdit" : "dialogAdd")}
      submitLabel={t(field ? "save" : "addButton")}
      action={saveCustomField.bind(null, workspace.id, field?.id ?? null)}
      done={() => t(field ? "saved" : "added", { name: label.trim() })}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <TextField
            className="w-full"
            name="label"
            label={t("label")}
            required
            value={label}
            onChange={setLabel}
            invalid={Boolean(fieldError("label"))}
            errorMessage={fieldError("label")}
          />
          {field ? (
            <p className="text-body-small text-on-surface-variant">
              {t("keyFixed", { key: field.key })}
            </p>
          ) : (
            <TextField
              className="w-full"
              name="key"
              label={t("key")}
              supportingText={t("keyHelp")}
              value={key ?? keyFrom(label)}
              onChange={setKey}
              invalid={Boolean(fieldError("key"))}
              errorMessage={fieldError("key")}
            />
          )}
          <Select
            className="w-full"
            name="type"
            label={t("type")}
            value={type}
            onChange={(next) => next != null && setType(String(next))}
            invalid={Boolean(fieldError("type"))}
            errorMessage={fieldError("type")}
          >
            {TYPES.map((value) => (
              <SelectItem key={value}>{t(`types.${value}`)}</SelectItem>
            ))}
          </Select>
          {FLAGS.map((flag) => (
            <div key={flag} className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <span id={`flag-${flag}`} className="text-body-large text-on-surface">
                  {t(flag)}
                </span>
                <span className="text-body-small text-on-surface-variant">{t(`${flag}Help`)}</span>
              </div>
              <Switch
                aria-labelledby={`flag-${flag}`}
                checked={flags[flag]}
                onCheckedChange={(on) => setFlags({ ...flags, [flag]: on })}
              />
              <input type="hidden" name={flag} value={String(flags[flag])} />
            </div>
          ))}
        </>
      )}
    </FormDialog>
  );
}
