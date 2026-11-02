"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { InvitationEmail } from "@/emails/invitation-email";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { getPublicEnv } from "@/lib/env";
import { type ErrorKey, type FormState, fieldErrorsFrom } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema } from "./schemas";

/** One address: sent, failed, or (with no email provider) a link to share. */
type InviteResult = { email: string; error?: ErrorKey; link?: string };
export type InviteState = FormState<"emails" | "roleId"> & { results?: InviteResult[] };

type ActionResult = { ok: true } | { ok: false; error: ErrorKey };

function errorKeyFor(error: { code?: string; message: string; hint?: string | null }): ErrorKey {
  if (
    error.hint === "unitOutsideReach" ||
    error.hint === "roleHasNoUnitReach" ||
    error.hint === "reactivateRolesNotHeld"
  ) {
    return error.hint;
  }
  if (error.code === "42501") return "notAllowed";
  if (error.message.includes("already a member")) return "alreadyMember";
  if (error.message.includes("open invitation")) return "alreadyInvited";
  return "generic";
}

function invitationUrl(token: string): string {
  return new URL(`/invite/${token}`, getPublicEnv().NEXT_PUBLIC_SITE_URL).toString();
}

/** Emails the invitation link. The token only exists here, right after it was created. */
async function sendInvitationEmail(token: string, email: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: token }).single();
  if (!data) return false;

  const t = await getTranslations("emails.invitation");
  const values = {
    workspace: data.workspace_name,
    inviter: data.inviter_name ?? data.workspace_name,
    role: data.role_name,
  };
  const acceptUrl = invitationUrl(token);

  try {
    await sendEmail({
      to: email,
      subject: t("subject", values),
      template: InvitationEmail({
        acceptUrl,
        text: {
          preview: t("preview", values),
          heading: t("heading", values),
          body: t("body", values),
          button: t("button"),
          linkHint: t("linkHint"),
          footer: t("footer"),
        },
      }),
    });
    return true;
  } catch (error) {
    console.error("Invitation email failed", error);
    return false;
  }
}

export async function inviteMembers(
  workspaceId: string,
  _previous: InviteState,
  formData: FormData
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const results: InviteResult[] = [];

  for (const email of parsed.data.emails) {
    const { data, error } = await supabase
      .rpc("create_invitation", {
        p_workspace_id: workspaceId,
        p_email: email,
        p_role_id: parsed.data.roleId,
      })
      .single();

    if (error || !data) {
      results.push({ email, error: error ? errorKeyFor(error) : "generic" });
      continue;
    }
    if (!emailConfigured()) {
      results.push({ email, link: invitationUrl(data.token) });
      continue;
    }
    const sent = await sendInvitationEmail(data.token, email);
    results.push(sent ? { email } : { email, error: "emailNotSent" });
  }

  revalidatePath("/w/[workspace]/settings/members", "page");
  return { status: results.some((r) => r.error) ? "error" : "success", results };
}

export async function resendInvitation(invitationId: string, email: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("resend_invitation", {
    p_invitation_id: invitationId,
  });
  if (error || !token) return { ok: false, error: error ? errorKeyFor(error) : "generic" };

  const sent = await sendInvitationEmail(token, email);
  revalidatePath("/w/[workspace]/settings/members", "page");
  return sent ? { ok: true } : { ok: false, error: "emailNotSent" };
}

/** A fresh link for an open invitation, to share by hand (the old link stops working). */
export async function invitationLink(
  invitationId: string
): Promise<{ ok: true; link: string } | { ok: false; error: ErrorKey }> {
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("resend_invitation", {
    p_invitation_id: invitationId,
  });
  if (error || !token) return { ok: false, error: error ? errorKeyFor(error) : "generic" };
  revalidatePath("/w/[workspace]/settings/members", "page");
  return { ok: true, link: invitationUrl(token) };
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: invitationId });
  revalidatePath("/w/[workspace]/settings/members", "page");
  return error ? { ok: false, error: errorKeyFor(error) } : { ok: true };
}

export async function setMemberRole(
  workspaceId: string,
  memberId: string,
  roleId: string,
  assigned: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const args = { p_workspace_id: workspaceId, p_member_id: memberId, p_role_id: roleId };
  const { error } = assigned
    ? await supabase.rpc("assign_role", args)
    : await supabase.rpc("remove_role", args);
  revalidatePath("/w/[workspace]/settings/members", "page");
  return error ? { ok: false, error: errorKeyFor(error) } : { ok: true };
}

export async function setMemberStatus(
  workspaceId: string,
  memberId: string,
  status: "active" | "inactive"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_status", {
    p_workspace_id: workspaceId,
    p_member_id: memberId,
    p_status: status,
  });
  revalidatePath("/w/[workspace]/settings/members", "page");
  return error ? { ok: false, error: errorKeyFor(error) } : { ok: true };
}

export async function acceptInvitation(
  token: string
): Promise<{ ok: true; slug: string } | { ok: false; error: ErrorKey }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !data)
    return { ok: false, error: error?.code === "42501" ? "notAllowed" : "linkInvalid" };
  return { ok: true, slug: data };
}

export async function transferOwnership(
  workspaceId: string,
  memberId: string,
  keepOwnership: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", {
    p_workspace_id: workspaceId,
    p_member_id: memberId,
    p_keep_ownership: keepOwnership,
  });
  revalidatePath("/w/[workspace]", "layout");
  return error ? { ok: false, error: errorKeyFor(error) } : { ok: true };
}

export async function leaveWorkspace(workspaceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_workspace", { p_workspace_id: workspaceId });
  // The "at least one active owner" rule is checked at commit (23514).
  if (error) return { ok: false, error: error.code === "23514" ? "lastOwner" : errorKeyFor(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** The units a role assignment covers, for roles that act on specific units. */
export async function setRoleUnits(assignmentId: string, unitIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_role_units", {
    p_member_role_id: assignmentId,
    p_unit_ids: unitIds,
  });
  revalidatePath("/w/[workspace]/settings/members", "page");
  return error ? { ok: false, error: errorKeyFor(error) } : { ok: true };
}
