"use client";

import { useTranslations } from "next-intl";
import { Checkbox, Select, SelectItem, TextField } from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { saveEndDate, saveFieldValue } from "../actions";
import type { FieldValue, PersonProfile } from "../types";
import { PersonPicker } from "./person-picker";

const today = () => new Date().toISOString().slice(0, 10);

export function EndDateDialog({ person, onClose }: { person: PersonProfile; onClose: () => void }) {
  const t = useTranslations("person.leaving");
  const tp = useTranslations("person");
  return (
    <FormDialog
      title={t("title")}
      submitLabel={tp("save")}
      action={saveEndDate.bind(null, person.id)}
      done={() => t("saved")}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <p className="text-body-medium text-on-surface-variant">{t("body")}</p>
          <IsoDateField
            name="endDate"
            label={t("date")}
            defaultValue={person.endDate ?? today()}
            min={person.startDate ?? undefined}
            required
            errorMessage={fieldError("endDate")}
          />
        </>
      )}
    </FormDialog>
  );
}

/** Edits one custom field with the input its type needs. */
export function FieldValueDialog({
  person,
  field,
  onClose,
}: {
  person: PersonProfile;
  field: FieldValue;
  onClose: () => void;
}) {
  const t = useTranslations("person");
  const value = field.value;
  const options = field.options.filter(
    (o) => !o.archived || o.id === value || (Array.isArray(value) && value.includes(o.id))
  );

  return (
    <FormDialog
      title={t("fields.edit", { name: field.label })}
      submitLabel={t("save")}
      action={saveFieldValue.bind(null, person.id, field.fieldId, field.type)}
      done={() => t("fields.saved", { name: field.label })}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          {field.keepHistory && (
            <IsoDateField
              name="validFrom"
              label={t("fields.from")}
              defaultValue={today()}
              required
            />
          )}
          {(field.type === "text" || field.type === "number") && (
            <TextField
              className="w-full"
              name="value"
              type={field.type === "number" ? "number" : "text"}
              label={field.label}
              defaultValue={value == null ? "" : String(value)}
              invalid={Boolean(fieldError("value"))}
              errorMessage={fieldError("value")}
            />
          )}
          {field.type === "date" && (
            <IsoDateField
              name="value"
              label={field.label}
              defaultValue={typeof value === "string" ? value : null}
              errorMessage={fieldError("value")}
            />
          )}
          {field.type === "single_choice" && (
            <Select
              className="w-full"
              name="value"
              label={field.label}
              defaultValue={typeof value === "string" ? value : ""}
            >
              {[{ id: "", label: t("fields.none") }, ...options].map((o) => (
                <SelectItem key={o.id}>{o.label}</SelectItem>
              ))}
            </Select>
          )}
          {field.type === "multi_choice" && (
            <fieldset className="flex flex-col gap-1">
              <legend className="text-body-medium text-on-surface-variant mb-1">
                {field.label}
              </legend>
              {options.map((o) => (
                <Checkbox
                  key={o.id}
                  name="value"
                  value={o.id}
                  defaultChecked={Array.isArray(value) && value.includes(o.id)}
                >
                  {o.label}
                </Checkbox>
              ))}
            </fieldset>
          )}
          {field.type === "person" && (
            <PersonPicker
              name="value"
              label={field.label}
              defaultValue={
                typeof value === "string" ? { id: value, name: field.personName ?? "" } : null
              }
            />
          )}
        </>
      )}
    </FormDialog>
  );
}
