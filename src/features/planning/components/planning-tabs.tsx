"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tab, Tabs } from "@windmorph/react";
import type { PlanningTab } from "../tabs";

/** The Planning screens as tabs on phones; from 600px the rail's panel lists them instead. */
export function PlanningTabs({ base, tabs }: { base: string; tabs: PlanningTab[] }) {
  const t = useTranslations("planning.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const current = tabs.find((tab) => pathname.startsWith(`${base}/${tab}`)) ?? tabs[0];
  return (
    <Tabs
      className="medium:hidden"
      variant="secondary"
      align="start"
      aria-label={t("label")}
      value={current}
      onChange={(key) => router.push(`${base}/${String(key)}`)}
    >
      {tabs.map((tab) => (
        <Tab key={tab} title={t(tab)} />
      ))}
    </Tabs>
  );
}
