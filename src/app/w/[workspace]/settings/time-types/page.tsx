import { requireSettingsSection } from "@/features/settings/require-section";
import { TimeTypesSettings } from "@/features/time/components/time-types-settings";
import { listTimeSettings } from "@/features/time/queries";

export default async function TimeTypesPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { types, roles } = await listTimeSettings(await requireSettingsSection(slug, "time-types"));
  return <TimeTypesSettings types={types} roles={roles} />;
}
