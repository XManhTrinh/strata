import { notFound } from "next/navigation";
import { type AuditEntry, AuditLog } from "@/features/audit/components/audit-log";
import { getWorkspaceId } from "@/features/roles/queries";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
const IGNORED_FIELDS = new Set(["updated_at", "token_hash"]);

function changedFields(before: unknown, after: unknown): string[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  return Object.keys(a).filter(
    (key) => !IGNORED_FIELDS.has(key) && JSON.stringify(a[key]) !== JSON.stringify(b[key])
  );
}

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ before?: string }>;
}) {
  const [{ workspace: slug }, { before }] = await Promise.all([params, searchParams]);
  const workspaceId = await getWorkspaceId(slug);
  if (!workspaceId) notFound();

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, actor_user_id, action, table_name, before, after, at")
    .eq("workspace_id", workspaceId)
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (before && /^\d+$/.test(before)) query = query.lt("id", Number(before));
  const { data: rows } = await query;

  const page = (rows ?? []).slice(0, PAGE_SIZE);
  const actorIds = [
    ...new Set(page.map((r) => r.actor_user_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const entries: AuditEntry[] = page.map((r) => ({
    id: r.id,
    actorName: (r.actor_user_id && names.get(r.actor_user_id)) || null,
    action: r.action as AuditEntry["action"],
    table: r.table_name,
    changedFields: r.action === "update" ? changedFields(r.before, r.after) : [],
    at: r.at,
  }));
  const last = page.at(-1);
  const olderHref = (rows?.length ?? 0) > PAGE_SIZE && last ? `?before=${last.id}` : null;

  return <AuditLog entries={entries} olderHref={olderHref} />;
}
