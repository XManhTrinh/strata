import { requireSettingsSection } from "@/features/settings/require-section";
import { notFound } from "next/navigation";
import { MembersSettings } from "@/features/members/components/members-settings";
import { unitChoices } from "@/features/structure/queries";
import type { MemberRow, PendingInvitation, RoleOption } from "@/features/members/types";
import { signedAvatarUrls } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";

export default async function MembersSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", await requireSettingsSection(slug, "members"))
    .single();
  if (!workspace) notFound();

  const [
    { data: auth },
    { data: members },
    { data: roles },
    { data: invitations },
    { data: unitRoleIds },
    units,
  ] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("members")
      .select(
        "id, full_name, email, status, is_owner, user_id, member_roles(id, role_id, member_role_units(org_unit_id))"
      )
      .eq("workspace_id", workspace.id)
      .order("full_name"),
    supabase
      .from("roles")
      .select("id, name, system_key, template_role_key")
      .eq("workspace_id", workspace.id)
      .is("archived_at", null)
      .order("name"),
    // RLS returns rows only to people holding members.invite.
    supabase
      .from("invitations")
      .select("id, email, role_id, expires_at")
      .eq("workspace_id", workspace.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase.rpc("roles_with_unit_reach", { p_workspace_id: workspace.id }),
    unitChoices(workspace.id),
  ]);

  const userId = auth?.claims.sub;
  const accountIds = (members ?? []).flatMap((m) => (m.user_id ? [m.user_id] : []));
  const { data: profiles } = accountIds.length
    ? await supabase.from("profiles").select("id, avatar_path").in("id", accountIds)
    : { data: [] };
  const avatarPathByUser = new Map((profiles ?? []).map((p) => [p.id, p.avatar_path]));
  const avatarUrls = await signedAvatarUrls(supabase, [...avatarPathByUser.values()]);
  const memberRows: MemberRow[] = (members ?? []).map((m) => ({
    id: m.id,
    fullName: m.full_name,
    email: m.email,
    status: m.status,
    isOwner: m.is_owner,
    isYou: m.user_id === userId,
    hasAccount: m.user_id !== null,
    avatarUrl: (m.user_id && avatarUrls.get(avatarPathByUser.get(m.user_id) ?? "")) || null,
    roleIds: m.member_roles.map((mr) => mr.role_id),
    assignments: m.member_roles.map((mr) => ({
      roleId: mr.role_id,
      id: mr.id,
      unitIds: mr.member_role_units.map((u) => u.org_unit_id),
    })),
  }));
  const roleOptions: RoleOption[] = (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    isSystem: r.system_key !== null,
    templateRoleKey: r.template_role_key,
    unitReach: (unitRoleIds ?? []).includes(r.id),
  }));
  const pending: PendingInvitation[] = (invitations ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    roleId: i.role_id,
    expiresAt: i.expires_at,
  }));

  return (
    <MembersSettings members={memberRows} roles={roleOptions} invitations={pending} units={units} />
  );
}
