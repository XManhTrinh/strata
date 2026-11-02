import { redirect } from "next/navigation";
import { AvatarEditor } from "@/features/account/components/avatar-editor";
import { ProfileForm } from "@/features/account/components/profile-form";
import { type AccountDeletion, YourData } from "@/features/account/components/your-data";
import { signedAvatarUrls } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) redirect("/sign-in?next=/account/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, time_zone, avatar_path")
    .eq("id", auth.claims.sub)
    .single();

  const [urls, { data: deletion }] = await Promise.all([
    signedAvatarUrls(supabase, [profile?.avatar_path]),
    supabase.rpc("my_account_deletion"),
  ]);
  const name = profile?.full_name ?? "";

  return (
    <div className="flex flex-col gap-8">
      <AvatarEditor
        userId={auth.claims.sub}
        name={name}
        avatarUrl={(profile?.avatar_path && urls.get(profile.avatar_path)) || null}
      />
      <ProfileForm initial={{ fullName: name, timeZone: profile?.time_zone ?? "UTC" }} />
      <YourData
        deletion={(deletion as AccountDeletion | null) ?? { deletes: [], leaves: [], blocked: [] }}
      />
    </div>
  );
}
