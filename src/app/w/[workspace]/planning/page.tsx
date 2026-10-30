import { redirect } from "next/navigation";
import { planningAccess } from "@/features/planning/access";

/** Planning opens on the first screen the user can use. */
export default async function PlanningRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const { tabs } = await planningAccess(workspace);
  redirect(`/w/${workspace}/planning/${tabs[0]}`);
}
