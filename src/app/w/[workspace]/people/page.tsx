import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { AddPerson } from "@/features/people/components/add-person";
import { PeopleDirectory } from "@/features/people/components/people-directory";
import {
  directorySearch,
  parseDirectoryParams,
  parseDirectoryView,
} from "@/features/people/directory-params";
import { jobChoices, peopleDirectory } from "@/features/people/queries";
import { defaultView, listTableViews } from "@/features/table-views/queries";
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

  const raw = await searchParams;
  const views = await listTableViews(workspace.id, "people");

  // A plain visit opens the default view, if there is one, with its filters in the URL.
  if (Object.keys(raw).length === 0) {
    const fallback = defaultView(views);
    if (fallback) {
      const search = directorySearch({ ...parseDirectoryView(fallback.state).params, page: 0 });
      redirect(`/w/${slug}/people${search}${search ? "&" : "?"}view=${fallback.id}`);
    }
  }

  const view = views.find((v) => v.id === raw.view);
  const query = parseDirectoryParams(raw);
  const [{ people, total }, choices, t] = await Promise.all([
    peopleDirectory(workspace.id, query),
    jobChoices(workspace.id),
    getTranslations("people"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="medium:px-6 flex justify-end px-4 pb-2">
        <AddPerson choices={choices} />
      </div>
      <div className="medium:px-6 px-4 pb-6">
        <PeopleDirectory
          // A different view starts the table afresh with its columns.
          key={view?.id ?? "none"}
          people={people}
          total={total}
          params={query}
          options={choices}
          views={views}
          viewId={view?.id ?? null}
        />
      </div>
    </>
  );
}
