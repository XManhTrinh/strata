import { notFound } from "next/navigation";
import { RolesList } from "@/features/roles/components/roles-list";
import { getWorkspaceId, listRoles } from "@/features/roles/queries";

export default async function RolesSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await getWorkspaceId(slug);
  if (!workspaceId) notFound();
  return <RolesList roles={await listRoles(workspaceId)} />;
}
