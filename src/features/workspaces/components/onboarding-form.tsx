"use client";

import { useActionState, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, Radio, RadioGroup, Select, SelectItem, TextField } from "@windmorph/react";
import { Skeleton, SkeletonGroup } from "@windmorph/react-pro";
import { FormError } from "@/features/auth/components/form-error";
import { idleFormState } from "@/lib/form-state";
import {
  COUNTRY_CODES,
  countryFromLocale,
  slugify,
  suggestedCurrency,
  suggestedFiscalYearStart,
  suggestedWeekStart,
} from "@/lib/regions";
import { createWorkspace } from "../actions";
import { TEMPLATE_KEYS, type TemplateKey } from "../schemas";

const WEEK_START_DAYS = [1, 6, 7] as const;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const noopSubscribe = () => () => {};

/** Renders the form only in the browser, where the time zone and language are known. */
export function OnboardingForm({ siteHost }: { siteHost: string }) {
  const inBrowser = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const t = useTranslations("onboarding");

  if (!inBrowser) {
    return (
      <SkeletonGroup label={t("title")}>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </SkeletonGroup>
    );
  }
  return <OnboardingFields siteHost={siteHost} />;
}

function OnboardingFields({ siteHost }: { siteHost: string }) {
  const t = useTranslations("onboarding");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [state, action, pending] = useActionState(createWorkspace, idleFormState);
  const fieldErrors = state.fieldErrors ?? {};

  const browserLocale = navigator.language;
  const [template, setTemplate] = useState<TemplateKey>("team");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [country, setCountry] = useState(() => countryFromLocale(browserLocale) ?? "GB");
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currency, setCurrency] = useState(() => suggestedCurrency(country));
  const [fiscalStart, setFiscalStart] = useState(() => String(suggestedFiscalYearStart(country)));
  const [weekStart, setWeekStart] = useState(() => String(suggestedWeekStart(browserLocale)));

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

  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function onCountryChange(value: string) {
    setCountry(value);
    setCurrency(suggestedCurrency(value));
    setFiscalStart(String(suggestedFiscalYearStart(value)));
  }

  return (
    <div className="flex flex-col gap-6">
      <FormError error={state.error} />

      <form action={action} noValidate className="flex flex-col gap-6">
        <RadioGroup
          name="template"
          label={t("templateLabel")}
          value={template}
          onChange={(value) => setTemplate(value as TemplateKey)}
        >
          {TEMPLATE_KEYS.map((key) => (
            <Radio key={key} value={key}>
              <span className="flex flex-col">
                <span className="text-body-large text-on-surface">
                  {t(`templates.${key}.name`)}
                </span>
                <span className="text-body-medium text-on-surface-variant">
                  {t(`templates.${key}.description`)}
                </span>
              </span>
            </Radio>
          ))}
        </RadioGroup>

        <TextField
          className="w-full"
          name="name"
          label={t("fields.name")}
          required
          value={name}
          onChange={onNameChange}
          invalid={Boolean(fieldErrors.name)}
          errorMessage={fieldErrors.name && te(fieldErrors.name)}
        />
        <TextField
          className="w-full"
          name="slug"
          label={t("fields.slug")}
          required
          prefix={`${siteHost}/w/`}
          value={slug}
          onChange={(value) => {
            setSlugEdited(true);
            setSlug(value.toLowerCase());
          }}
          supportingText={t("fields.slugHint")}
          invalid={Boolean(fieldErrors.slug)}
          errorMessage={fieldErrors.slug && te(fieldErrors.slug)}
        />

        <fieldset className="flex flex-col gap-4">
          <legend className="text-title-medium text-on-surface mb-2">{t("regionSection")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              className="w-full"
              name="country"
              label={t("fields.country")}
              searchable
              value={country}
              onChange={(key) => key != null && onCountryChange(String(key))}
              invalid={Boolean(fieldErrors.country)}
              labels={{ search: t("search") }}
            >
              {countries.map((c) => (
                <SelectItem key={c.code}>{c.name}</SelectItem>
              ))}
            </Select>
            <Select
              className="w-full"
              name="timeZone"
              label={t("fields.timeZone")}
              searchable
              value={timeZone}
              onChange={(key) => key != null && setTimeZone(String(key))}
              invalid={Boolean(fieldErrors.timeZone)}
              labels={{ search: t("search") }}
            >
              {timeZones.map((zone) => (
                <SelectItem key={zone}>{zone.replaceAll("_", " ")}</SelectItem>
              ))}
            </Select>
            <Select
              className="w-full"
              name="currency"
              label={t("fields.currency")}
              searchable
              value={currency}
              onChange={(key) => key != null && setCurrency(String(key))}
              invalid={Boolean(fieldErrors.currency)}
              labels={{ search: t("search") }}
            >
              {currencies.map((c) => (
                <SelectItem key={c.code}>{c.label}</SelectItem>
              ))}
            </Select>
            <Select
              className="w-full"
              name="fiscalYearStartMonth"
              label={t("fields.fiscalYearStart")}
              value={fiscalStart}
              onChange={(key) => key != null && setFiscalStart(String(key))}
            >
              {MONTHS.map((month) => (
                <SelectItem key={String(month)}>{monthName(month)}</SelectItem>
              ))}
            </Select>
            <Select
              className="w-full"
              name="weekStart"
              label={t("fields.weekStart")}
              value={weekStart}
              onChange={(key) => key != null && setWeekStart(String(key))}
            >
              {WEEK_START_DAYS.map((day) => (
                <SelectItem key={String(day)}>{dayName(day)}</SelectItem>
              ))}
            </Select>
          </div>
        </fieldset>

        <Button type="submit" variant="filled" pending={pending} className="self-end">
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}
