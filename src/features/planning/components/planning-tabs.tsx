"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tab, Tabs } from "@windmorph/react";

export type PlanningTab = "scenarios" | "compare" | "rate-cards";

/** The Planning screens the user can open, as tabs that change the address. */
export function PlanningTabs({ base, tabs }: { base: string; tabs: PlanningTab[] }) {
  const t = useTranslations("planning.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const current = tabs.find((tab) => pathname.startsWith(`${base}/${tab}`)) ?? tabs[0];
  return (
    <Tabs
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
