import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { PersonProfileView } from "@/features/people/components/person-profile";
import { jobChoices, personProfile } from "@/features/people/queries";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({
  params,
}: {
  params: Promise<{ workspace: string; memberId: string }>;
}) {
  const { workspace: slug, memberId } = await params;
  if (!UUID.test(memberId)) notFound();
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();

  const [person, choices, t] = await Promise.all([
    personProfile(workspace.id, memberId),
    jobChoices(workspace.id),
    getTranslations("people"),
  ]);
  if (!person) notFound();

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 px-4 pb-6">
        <PersonProfileView person={person} choices={choices} />
      </div>
    </>
  );
}
