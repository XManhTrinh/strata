import { requireSettingsSection } from "@/features/settings/require-section";
import { RolesList } from "@/features/roles/components/roles-list";
import { listRoles } from "@/features/roles/queries";

export default async function RolesSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "roles");
  return <RolesList roles={await listRoles(workspaceId)} />;
}
