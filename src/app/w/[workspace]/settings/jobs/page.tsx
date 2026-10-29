import { requireSettingsSection } from "@/features/settings/require-section";
import { JobsSettings } from "@/features/structure/components/jobs-settings";
import { listJobs } from "@/features/structure/queries";

export default async function JobsSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const workspaceId = await requireSettingsSection(slug, "jobs");
  return <JobsSettings {...await listJobs(workspaceId)} />;
}
