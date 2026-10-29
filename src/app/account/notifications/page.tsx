import { NotificationPreferences } from "@/features/account/components/notification-preferences";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationPreferencesPage() {
  const supabase = await createClient();
  // RLS returns only the signed-in user's preferences.
  const { data } = await supabase
    .from("notification_preferences")
    .select("category, email_delivery");
  return (
    <NotificationPreferences
      preferences={Object.fromEntries((data ?? []).map((p) => [p.category, p.email_delivery]))}
    />
  );
}
