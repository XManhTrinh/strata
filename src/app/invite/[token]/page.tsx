import { getTranslations } from "next-intl/server";
import { Button } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { signOut } from "@/features/auth/actions";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { AcceptInvitationButton } from "@/features/members/components/accept-invitation-button";
import { createClient } from "@/lib/supabase/server";

type InvitationStatus = "open" | "expired" | "revoked" | "accepted" | "invalid";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("invite");
  const supabase = await createClient();

  const [{ data: invitation }, { data: auth }] = await Promise.all([
    supabase.rpc("get_invitation", { p_token: token }).maybeSingle(),
    supabase.auth.getClaims(),
  ]);

  const status = (invitation?.status ?? "invalid") as InvitationStatus;

  if (!invitation || status !== "open") {
    return (
      <main className="bg-surface-container-low flex min-h-dvh items-center justify-center p-4">
        <h1 className="sr-only">{t("title")}</h1>
        <EmptyState
          size="lg"
          titleAs="h2"
          icon={<Icon name="link_off" />}
          title={t(`status.${status === "open" ? "invalid" : status}`)}
          actions={
            <Button variant="tonal" href="/">
              {t("goHome")}
            </Button>
          }
        />
      </main>
    );
  }

  const values = {
    inviter: invitation.inviter_name ?? "",
    email: invitation.email,
    workspace: invitation.workspace_name,
    role: invitation.role_name,
  };
  const signedInEmail = typeof auth?.claims.email === "string" ? auth.claims.email : null;
  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <main className="bg-surface-container-low flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthPanel
          title={t("title")}
          subtitle={invitation.inviter_name ? t("body", values) : t("bodyNoInviter", values)}
        >
          {!signedInEmail && (
            <div className="flex flex-col gap-3">
              <Button variant="filled" href={`/sign-in?next=${next}`}>
                {t("signIn")}
              </Button>
              <Button variant="outlined" href={`/sign-up?next=${next}`}>
                {t("createAccount")}
              </Button>
            </div>
          )}
          {signedInEmail && signedInEmail.toLowerCase() === invitation.email.toLowerCase() && (
            <AcceptInvitationButton token={token} />
          )}
          {signedInEmail && signedInEmail.toLowerCase() !== invitation.email.toLowerCase() && (
            <div className="flex flex-col gap-4">
              <p className="text-body-medium text-on-surface-variant">
                {t("wrongAccount", { current: signedInEmail, email: invitation.email })}
              </p>
              <form action={signOut}>
                <Button type="submit" variant="outlined" className="w-full">
                  {t("signOut")}
                </Button>
              </form>
            </div>
          )}
        </AuthPanel>
      </div>
    </main>
  );
}
