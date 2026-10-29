"use client";

import { useTranslations } from "next-intl";
import type { OrgLevel, OrgUnit } from "../types";
import { LevelsSection } from "./levels-section";
import { UnitsSection } from "./units-section";

export function HierarchySettings({ levels, units }: { levels: OrgLevel[]; units: OrgUnit[] }) {
  const t = useTranslations("hierarchy");
  return (
    <section aria-labelledby="hierarchy-title" className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id="hierarchy-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      </div>
      <LevelsSection levels={levels} units={units} />
      <UnitsSection levels={levels} units={units} />
    </section>
  );
}
