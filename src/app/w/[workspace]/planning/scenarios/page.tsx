import { notFound } from "next/navigation";
import { planningAccess } from "@/features/planning/access";
import { ScenariosPage } from "@/features/planning/components/scenarios-page";
import { getPlanningSettings } from "@/features/planning/queries";
import { listScenarios } from "@/features/planning/scenario-queries";

export default async function ScenariosRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, held } = await planningAccess(slug);
  if (!held.has("planning.view")) notFound();
  const [scenarios, settings] = await Promise.all([
    listScenarios(workspace.id),
    getPlanningSettings(workspace.id),
  ]);
  return (
    <ScenariosPage
      scenarios={scenarios}
      lifecycle={settings?.lifecycle ?? true}
      horizonYears={settings?.horizonYears ?? 2}
    />
  );
}
