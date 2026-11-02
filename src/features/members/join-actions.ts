"use server";

import { revalidatePath } from "next/cache";
import { errorKey } from "@/features/structure/errors";
import { getPublicEnv } from "@/lib/env";
import type { ErrorKey } from "@/lib/form-state";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: ErrorKey };

function revalidateMembers() {
  revalidatePath("/w/[workspace]/settings/members", "page");
}

/**
 * Switches the workspace's join link on, or replaces it (the old link stops working), and returns
 * the new link: it is shown this once.
 */
export async function setJoinLink(
  workspaceId: string,
  roleId: string,
  expiresInDays: number | null
): Promise<{ ok: true; link: string } | { ok: false; error: ErrorKey }> {
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("set_join_link", {
    p_workspace_id: workspaceId,
    p_role_id: roleId,
    p_expires_at: expiresInDays
      ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
      : undefined,
  });
  if (error || !token) return { ok: false, error: error ? errorKey(error, "generic") : "generic" };
  revalidateMembers();
  return {
    ok: true,
    link: new URL(`/join/${token}`, getPublicEnv().NEXT_PUBLIC_SITE_URL).toString(),
  };
}

export async function disableJoinLink(workspaceId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("disable_join_link", { p_workspace_id: workspaceId });
  if (error) return { ok: false, error: errorKey(error, "generic") };
  revalidateMembers();
  return { ok: true };
}

export async function decideJoinRequest(
  requestId: string,
  approve: boolean,
  roleId: string | null
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_join_request", {
    p_request_id: requestId,
    p_approve: approve,
    p_role_id: roleId ?? undefined,
  });
  if (error) return { ok: false, error: errorKey(error, "generic") };
  revalidateMembers();
  return { ok: true };
}

export async function requestToJoin(token: string, message: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_to_join", { p_token: token, p_message: message });
  if (error) return { ok: false, error: errorKey(error, "generic") };
  revalidatePath(`/join/${token}`);
  return { ok: true };
}

export async function withdrawJoinRequest(requestId: string, token: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_join_request", { p_request_id: requestId });
  if (error) return { ok: false, error: errorKey(error, "generic") };
  revalidatePath(`/join/${token}`);
  return { ok: true };
}
