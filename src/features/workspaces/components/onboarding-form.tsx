"use client";

import { useFormAction } from "@/lib/use-form-action";
import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button, Radio, RadioGroup, TextField } from "@windmorph/react";
import { Skeleton, SkeletonGroup } from "@windmorph/react-pro";
import { FormError } from "@/features/auth/components/form-error";
import { idleFormState } from "@/lib/form-state";
import {
  countryFromLocale,
  slugify,
  suggestedCurrency,
  suggestedFiscalYearStart,
  suggestedWeekStart,
} from "@/lib/regions";
import { createWorkspace } from "../actions";
import { TEMPLATE_KEYS, type TemplateKey } from "../schemas";
import { type RegionValues, RegionFields } from "./region-fields";

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
  const [state, onSubmit, pending] = useFormAction(createWorkspace, idleFormState);
  const fieldErrors = state.fieldErrors ?? {};

  const browserLocale = navigator.language;
  const [template, setTemplate] = useState<TemplateKey>("team");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [region, setRegion] = useState<RegionValues>(() => {
    const country = countryFromLocale(browserLocale) ?? "GB";
    return {
      country,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: suggestedCurrency(country),
      fiscalYearStartMonth: String(suggestedFiscalYearStart(country)),
      weekStart: String(suggestedWeekStart(browserLocale)),
    };
  });

  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function onRegionChange(field: keyof RegionValues, next: string) {
    setRegion((current) =>
      field === "country"
        ? {
            ...current,
            country: next,
            currency: suggestedCurrency(next),
            fiscalYearStartMonth: String(suggestedFiscalYearStart(next)),
          }
        : { ...current, [field]: next }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FormError error={state.error} />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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

        <RegionFields value={region} onChange={onRegionChange} fieldErrors={fieldErrors} />

        <Button type="submit" variant="filled" pending={pending} className="self-end">
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}
