"use client";

import { useTranslations } from "next-intl";
import type { CareerLevel, EmploymentType, Position } from "../types";
import { CareerLevelsSection } from "./career-levels-section";
import { EmploymentTypesSection } from "./employment-types-section";
import { PositionsSection } from "./positions-section";

export function JobsSettings({
  careerLevels,
  positions,
  employmentTypes,
}: {
  careerLevels: CareerLevel[];
  positions: Position[];
  employmentTypes: EmploymentType[];
}) {
  const t = useTranslations("jobs");
  return (
    <section aria-labelledby="jobs-title" className="flex max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id="jobs-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      </div>
      <CareerLevelsSection levels={careerLevels} />
      <PositionsSection positions={positions} levels={careerLevels} />
      <EmploymentTypesSection types={employmentTypes} />
    </section>
  );
}
