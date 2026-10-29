import { requireSettingsSection } from "@/features/settings/require-section";
import { CustomFieldsSettings } from "@/features/structure/components/custom-fields-settings";
import { listCustomFields } from "@/features/structure/queries";

export default async function CustomFieldsSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "fields");
  return <CustomFieldsSettings fields={await listCustomFields(workspaceId)} />;
}
