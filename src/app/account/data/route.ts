import { createClient } from "@/lib/supabase/server";

/** Your own data from every workspace you're in, as a JSON file. */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_data");
  if (error || !data) return new Response("Not allowed", { status: 403 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-strata-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
