"use client";

import { useTranslations } from "next-intl";
import { Select, SelectItem } from "@windmorph/react";
import { DIRECTORY_STATUSES, type DirectoryParams } from "../directory-params";
import type { DirectoryFilterOptions, FilterOption } from "../types";

type FilterKey = "unitId" | "positionId" | "employmentTypeId";

/** Unit, position, employment type and status filters, beside the directory's search. */
export function DirectoryFilters({
  params,
  options,
  onChange,
}: {
  params: DirectoryParams;
  options: DirectoryFilterOptions;
  onChange: (patch: Partial<DirectoryParams>) => void;
}) {
  const t = useTranslations("people.filters");

  const filter = (key: FilterKey, label: string, list: FilterOption[], searchable = false) =>
    list.length > 0 && (
      <Select
        className="w-48"
        label={label}
        searchable={searchable}
        labels={searchable ? { search: label } : undefined}
        value={params[key] ?? "all"}
        onChange={(value) =>
          value != null && onChange({ [key]: value === "all" ? null : String(value) })
        }
      >
        {[{ id: "all", label: t("all") }, ...list].map((option) => (
          <SelectItem key={option.id} textValue={option.label.trim()}>
            {option.label}
          </SelectItem>
        ))}
      </Select>
    );

  return (
    <>
      {filter("unitId", t("unit"), options.units, true)}
      {filter("positionId", t("position"), options.positions, true)}
      {filter("employmentTypeId", t("employmentType"), options.employmentTypes)}
      <Select
        className="w-40"
        label={t("status")}
        value={params.status}
        onChange={(value) =>
          value != null && onChange({ status: String(value) as DirectoryParams["status"] })
        }
      >
        {DIRECTORY_STATUSES.map((status) => (
          <SelectItem key={status}>{t(`statuses.${status}`)}</SelectItem>
        ))}
      </Select>
    </>
  );
}
