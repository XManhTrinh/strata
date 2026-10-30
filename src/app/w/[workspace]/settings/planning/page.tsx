import { notFound } from "next/navigation";
import { PlanningSettingsForm } from "@/features/planning/components/planning-settings-form";
import { getPlanningSettings, listFieldChoices } from "@/features/planning/queries";
import { requireSettingsSection } from "@/features/settings/require-section";

export default async function PlanningSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "planning");
  const [settings, fields] = await Promise.all([
    getPlanningSettings(workspaceId),
    listFieldChoices(workspaceId),
  ]);
  if (!settings) notFound();
  return <PlanningSettingsForm settings={settings} fields={fields} />;
}
