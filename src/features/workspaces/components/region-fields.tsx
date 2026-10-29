"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Select, SelectItem } from "@windmorph/react";
import type { ErrorKey } from "@/lib/form-state";
import { COUNTRY_CODES } from "@/lib/regions";

export type RegionValues = {
  country: string;
  timeZone: string;
  currency: string;
  fiscalYearStartMonth: string;
  weekStart: string;
};

type RegionField = keyof RegionValues;

const WEEK_START_DAYS = [1, 6, 7] as const;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Country, time zone, currency, fiscal year start and week start, as named form fields.
 * Option names come from Intl in the user's language. Used by onboarding and General settings.
 */
export function RegionFields({
  value,
  onChange,
  fieldErrors = {},
}: {
  value: RegionValues;
  onChange: (field: RegionField, next: string) => void;
  fieldErrors?: Partial<Record<string, ErrorKey>>;
}) {
  const t = useTranslations("onboarding");
  const te = useTranslations("errors");
  const locale = useLocale();

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
      a.name.localeCompare(b.name, locale)
    );
  }, [locale]);

  const currencies = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "currency" });
    return Intl.supportedValuesOf("currency").map((code) => ({
      code,
      label: `${names.of(code) ?? code} (${code})`,
    }));
  }, [locale]);

  const timeZones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  const monthName = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
    return (month: number) => format.format(Date.UTC(2000, month - 1, 1));
  }, [locale]);

  const dayName = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
    // 3 January 2000 was a Monday (ISO weekday 1).
    return (isoDay: number) => format.format(Date.UTC(2000, 0, 2 + isoDay));
  }, [locale]);

  const select = (field: RegionField) => ({
    name: field,
    className: "w-full",
    value: value[field],
    onChange: (key: unknown) => key != null && onChange(field, String(key)),
    invalid: Boolean(fieldErrors[field]),
    errorMessage: fieldErrors[field] && te(fieldErrors[field]),
  });

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-title-medium text-on-surface mb-2">{t("regionSection")}</legend>
      <div className="medium:grid-cols-2 grid gap-4">
        <Select
          {...select("country")}
          label={t("fields.country")}
          searchable
          labels={{ search: t("search") }}
        >
          {countries.map((c) => (
            <SelectItem key={c.code}>{c.name}</SelectItem>
          ))}
        </Select>
        <Select
          {...select("timeZone")}
          label={t("fields.timeZone")}
          searchable
          labels={{ search: t("search") }}
        >
          {timeZones.map((zone) => (
            <SelectItem key={zone}>{zone.replaceAll("_", " ")}</SelectItem>
          ))}
        </Select>
        <Select
          {...select("currency")}
          label={t("fields.currency")}
          searchable
          labels={{ search: t("search") }}
        >
          {currencies.map((c) => (
            <SelectItem key={c.code}>{c.label}</SelectItem>
          ))}
        </Select>
        <Select {...select("fiscalYearStartMonth")} label={t("fields.fiscalYearStart")}>
          {MONTHS.map((month) => (
            <SelectItem key={String(month)}>{monthName(month)}</SelectItem>
          ))}
        </Select>
        <Select {...select("weekStart")} label={t("fields.weekStart")}>
          {WEEK_START_DAYS.map((day) => (
            <SelectItem key={String(day)}>{dayName(day)}</SelectItem>
          ))}
        </Select>
      </div>
    </fieldset>
  );
}
