import { redirect } from "next/navigation";

/** Planning opens on its first screen. */
export default async function PlanningRoute({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/w/${workspace}/planning/rate-cards`);
}
