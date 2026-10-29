import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/account/components/profile-form";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) redirect("/sign-in?next=/account/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, time_zone")
    .eq("id", auth.claims.sub)
    .single();

  return (
    <ProfileForm
      initial={{ fullName: profile?.full_name ?? "", timeZone: profile?.time_zone ?? "UTC" }}
    />
  );
}
