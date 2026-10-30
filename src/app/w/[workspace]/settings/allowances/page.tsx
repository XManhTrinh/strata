import { requireSettingsSection } from "@/features/settings/require-section";
import { AllowancesSettings } from "@/features/time/components/allowances-settings";
import { listTimeSettings } from "@/features/time/queries";

export default async function AllowancesPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { policies, types } = await listTimeSettings(
    await requireSettingsSection(slug, "allowances")
  );
  return <AllowancesSettings policies={policies} types={types} />;
}
