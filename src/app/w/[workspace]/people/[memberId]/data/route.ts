import { createClient } from "@/lib/supabase/server";

/** Everything Strata holds about a person, as a JSON file (the database checks who may). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspace: string; memberId: string }> }
) {
  const { memberId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("person_data", { p_member_id: memberId });
  if (error || !data) return new Response("Not allowed", { status: 403 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="person-${memberId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
