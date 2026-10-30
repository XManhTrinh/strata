import { notFound } from "next/navigation";
import { planningAccess } from "@/features/planning/access";
import { ScenarioDetail } from "@/features/planning/components/scenario-detail";
import { getPlanningSettings } from "@/features/planning/queries";
import { listPlannedRoles, listScenarios } from "@/features/planning/scenario-queries";
import { jobChoices } from "@/features/people/queries";

export default async function ScenarioRoute({
  params,
}: {
  params: Promise<{ workspace: string; scenario: string }>;
}) {
  const { workspace: slug, scenario: scenarioId } = await params;
  const { workspace, held } = await planningAccess(slug);
  if (!held.has("planning.view")) notFound();
  const [scenarios, settings, choices, plannedRoles] = await Promise.all([
    listScenarios(workspace.id),
    getPlanningSettings(workspace.id),
    jobChoices(workspace.id),
    listPlannedRoles(scenarioId),
  ]);
  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (!scenario || !settings) notFound();
  return (
    <ScenarioDetail
      scenario={scenario}
      settings={settings}
      choices={choices}
      plannedRoles={plannedRoles}
      canEdit={held.has("planning.edit")}
    />
  );
}
