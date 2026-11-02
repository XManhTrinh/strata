import { notFound } from "next/navigation";
import { PersonalDataSettings } from "@/features/people/components/personal-data-settings";
import { getRetention, listErasures } from "@/features/people/retention";
import { requireSettingsSection } from "@/features/settings/require-section";

export default async function PersonalDataSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "personal-data");
  const [rules, erasures] = await Promise.all([
    getRetention(workspaceId),
    listErasures(workspaceId),
  ]);
  if (!rules) notFound();
  return <PersonalDataSettings rules={rules} erasures={erasures} />;
}
