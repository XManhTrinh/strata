import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { planningAccess } from "@/features/planning/access";
import { PlanningTabs } from "@/features/planning/components/planning-tabs";

export default async function PlanningLayout({
  params,
  children,
}: {
  params: Promise<{ workspace: string }>;
  children: ReactNode;
}) {
  const { workspace: slug } = await params;
  const [{ tabs }, t] = await Promise.all([planningAccess(slug), getTranslations("planning")]);
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 flex flex-col gap-6 px-4 pb-6">
        <PlanningTabs base={`/w/${slug}/planning`} tabs={tabs} />
        {children}
      </div>
    </>
  );
}
