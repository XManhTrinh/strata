import { getTranslations } from "next-intl/server";
import { feedCalendar } from "@/features/time/ics";
import { createClient } from "@/lib/supabase/server";

/**
 * A calendar feed (iCalendar), read by calendar apps without signing in: the token in the link is
 * the key, and the database shows only what the link's owner may see.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const value = token.replace(/\.ics$/, "");
  if (!/^[0-9a-f]{64}$/.test(value)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.rpc("calendar_feed", { p_token: value });
  const t = await getTranslations("timeOff");
  const body = feedCalendar(
    t("feed.calendarName"),
    (data ?? []).map((b) => ({
      id: b.booking_id,
      memberName: b.member_name,
      typeName: b.time_type_name,
      title: b.title,
      startDate: b.start_date,
      endDate: b.end_date,
      startHalf: b.start_half,
      endHalf: b.end_half,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      status: b.status,
      recurrenceRule: b.recurrence_rule,
      updatedAt: b.updated_at,
    })),
    { busy: t("calendar.busy"), half: t("feed.halfDay") }
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
