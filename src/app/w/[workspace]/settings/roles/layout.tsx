import type { ReactNode } from "react";
import { RolesLayout } from "@/features/roles/components/roles-layout";
import { listRoles } from "@/features/roles/queries";
import { requireSettingsSection } from "@/features/settings/require-section";

export default async function RolesSettingsLayout({
  params,
  children,
}: {
  params: Promise<{ workspace: string }>;
  children: ReactNode;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "roles");
  return <RolesLayout roles={await listRoles(workspaceId)}>{children}</RolesLayout>;
}
