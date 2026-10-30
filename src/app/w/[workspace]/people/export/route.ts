import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { parseDirectoryParams } from "@/features/people/directory-params";
import { CSV_BOM, csvRow } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

const PAGE = 5000;

type Row = {
  full_name: string;
  email: string | null;
  unit_name: string | null;
  position_name: string | null;
  career_level_name: string | null;
  employment_type_name: string | null;
  manager_name: string | null;
  start_date: string | null;
};

/** Directory column id → its value; the header comes from people.columns. */
const COLUMNS: Record<string, { header: string; value: (r: Row) => string | null }> = {
  name: { header: "name", value: (r) => r.full_name },
  unit: { header: "unit", value: (r) => r.unit_name },
  position: { header: "position", value: (r) => r.position_name },
  level: { header: "level", value: (r) => r.career_level_name },
  type: { header: "employmentType", value: (r) => r.employment_type_name },
  manager: { header: "manager", value: (r) => r.manager_name },
  email: { header: "email", value: (r) => r.email },
  start_date: { header: "startDate", value: (r) => r.start_date },
};

/**
 * The directory as CSV, with the same search, filters and sort, in the given columns (`cols`).
 * Only people within the caller's people.export reach are included; streamed page by page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspace: string }> }
) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!workspace) return new Response("Not found", { status: 404 });

  const { data: permissions } = await supabase.rpc("my_permissions", {
    p_workspace_id: workspace.id,
  });
  if (!permissions?.some((p) => p.permission_key === "people.export")) {
    return new Response("Not allowed", { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const query = parseDirectoryParams(Object.fromEntries(search));
  const requested = (search.get("cols") ?? "").split(",").filter((id) => id in COLUMNS);
  const columns = (requested.length ? requested : Object.keys(COLUMNS)).map((id) => COLUMNS[id]!);
  const t = await getTranslations("people.columns");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(CSV_BOM + csvRow(columns.map((c) => t(c.header as "name"))))
      );
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await supabase.rpc("people_directory", {
          p_workspace_id: workspace.id,
          p_search: query.search,
          p_unit_id: query.unitId ?? undefined,
          p_position_id: query.positionId ?? undefined,
          p_employment_type_id: query.employmentTypeId ?? undefined,
          p_status: query.status,
          p_sort: query.sort,
          p_descending: query.descending,
          p_limit: PAGE,
          p_offset: offset,
          p_for_export: true,
        });
        if (error) {
          controller.error(new Error(error.message));
          return;
        }
        const rows = data ?? [];
        controller.enqueue(
          encoder.encode(rows.map((r) => csvRow(columns.map((c) => c.value(r)))).join(""))
        );
        if (rows.length < PAGE) break;
      }
      controller.close();
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="people-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
