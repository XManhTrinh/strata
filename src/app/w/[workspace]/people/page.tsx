import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { PeopleDirectory } from "@/features/people/components/people-directory";
import { parseDirectoryParams } from "@/features/people/directory-params";
import { directoryFilterOptions, peopleDirectory } from "@/features/people/queries";
import { createClient } from "@/lib/supabase/server";

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) notFound();

  const query = parseDirectoryParams(await searchParams);
  const [{ people, total }, options, t] = await Promise.all([
    peopleDirectory(workspace.id, query),
    directoryFilterOptions(workspace.id),
    getTranslations("people"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 px-4 pb-6">
        <PeopleDirectory people={people} total={total} params={query} options={options} />
      </div>
    </>
  );
}
