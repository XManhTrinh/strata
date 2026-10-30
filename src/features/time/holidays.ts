import "server-only";
import Holidays from "date-holidays";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Public and bank holidays for a country (and region) in a year, from the holiday library. */
function libraryHolidays(
  country: string,
  region: string | null,
  year: number
): { date: string; name: string }[] {
  const source = region ? new Holidays(country, region) : new Holidays(country);
  const seen = new Set<string>();
  return (source.getHolidays(year) || [])
    .filter((h) => h.type === "public" || h.type === "bank")
    .map((h) => ({ date: h.date.slice(0, 10), name: h.name }))
    .filter((h) => !seen.has(h.date) && seen.add(h.date));
}

/** Countries and their regions the library knows, for choosing a calendar. */
export function libraryCountries(): {
  code: string;
  name: string;
  regions: Record<string, string>;
}[] {
  const library = new Holidays();
  return Object.entries(library.getCountries("en") ?? {}).map(([code, name]) => ({
    code,
    name,
    regions: library.getStates(code, "en") ?? {},
  }));
}

/**
 * Adds a generated calendar's holidays for some years, only on dates it doesn't have yet, so days
 * someone edited or removed by hand stay as they are. Runs with the caller's rights (RLS).
 */
export async function generateHolidays(
  supabase: SupabaseClient<Database>,
  calendar: { id: string; workspace_id: string; country: string | null; region: string | null },
  years: number[]
): Promise<number> {
  if (!calendar.country) return 0;
  const wanted = years.flatMap((year) => libraryHolidays(calendar.country!, calendar.region, year));
  if (wanted.length === 0) return 0;
  const { data: existing } = await supabase
    .from("holidays")
    .select("date")
    .eq("calendar_id", calendar.id)
    .in(
      "date",
      wanted.map((h) => h.date)
    );
  const have = new Set((existing ?? []).map((h) => h.date));
  const missing = wanted.filter((h) => !have.has(h.date));
  if (missing.length === 0) return 0;
  const { error } = await supabase.from("holidays").insert(
    missing.map((h) => ({
      workspace_id: calendar.workspace_id,
      calendar_id: calendar.id,
      date: h.date,
      name: h.name,
    }))
  );
  if (error) throw new Error(error.message);
  return missing.length;
}
