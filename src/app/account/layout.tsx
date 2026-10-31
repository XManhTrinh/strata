import type { ReactNode } from "react";
import { AccountFrame } from "@/features/account/components/account-frame";
import { AccountShell } from "@/features/account/components/account-shell";
import { loadWorkspaceContext } from "@/features/workspaces/load-context";
import { createClient } from "@/lib/supabase/server";

/** In the frame of the workspace used last; on its own for someone in no workspace yet. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const email = typeof auth?.claims.email === "string" ? auth.claims.email : "";
  // Signed-out visitors reach each page, which sends them to sign in.
  const context = auth?.claims.sub
    ? await loadWorkspaceContext(auth.claims.sub, email, null)
    : null;
  return context ? (
    <AccountFrame context={context}>{children}</AccountFrame>
  ) : (
    <AccountShell>{children}</AccountShell>
  );
}
