"use client";

import { useTranslations } from "next-intl";
import { Select, SelectItem } from "@windmorph/react";
import type { FilterOption, JobChoices, JobRecord } from "../types";
import { PersonPicker } from "./person-picker";

type ChoiceField = "unitId" | "positionId" | "careerLevelId" | "employmentTypeId";

/** Unit, manager, position, career level and employment type, as named form fields. */
export function JobFields({
  choices,
  current,
  defaultUnitId,
  memberId,
  fieldError,
}: {
  choices: JobChoices;
  /** The values to start from, e.g. today's job record. */
  current?: JobRecord;
  /** The unit to start from when there's no job record yet, e.g. the root. */
  defaultUnitId?: string;
  memberId?: string;
  fieldError: (field: string) => string | undefined;
}) {
  const t = useTranslations("person.jobRecord");

  const select = (
    field: ChoiceField,
    label: string,
    options: FilterOption[],
    initial: string | null | undefined,
    optional = true
  ) => (
    <Select
      className="w-full"
      name={field}
      label={label}
      searchable={options.length > 10}
      labels={{ search: label }}
      defaultValue={initial ?? (optional ? "" : null)}
      invalid={Boolean(fieldError(field))}
      errorMessage={fieldError(field)}
    >
      {[...(optional ? [{ id: "", label: t("none") }] : []), ...options].map((option) => (
        <SelectItem key={option.id} textValue={option.label.trim() || t("none")}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );

  return (
    <>
      {select("unitId", t("unit"), choices.units, current?.unitId ?? defaultUnitId, false)}
      <PersonPicker
        name="managerId"
        label={t("manager")}
        defaultValue={
          current?.managerId ? { id: current.managerId, name: current.managerName ?? "" } : null
        }
        exclude={memberId}
        errorMessage={fieldError("managerId")}
      />
      {select("positionId", t("position"), choices.positions, current?.positionId)}
      {select("careerLevelId", t("level"), choices.careerLevels, current?.careerLevelId)}
      {select(
        "employmentTypeId",
        t("employmentType"),
        choices.employmentTypes,
        current?.employmentTypeId
      )}
    </>
  );
}
