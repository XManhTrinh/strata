import { requireSettingsSection } from "@/features/settings/require-section";
import { HierarchySettings } from "@/features/structure/components/hierarchy-settings";
import { listHierarchy } from "@/features/structure/queries";

export default async function HierarchySettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "hierarchy");
  return <HierarchySettings {...await listHierarchy(workspaceId)} />;
}
