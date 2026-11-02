import { getTranslations } from "next-intl/server";
import { Button } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { JoinForm } from "@/features/members/components/join-form";
import { createClient } from "@/lib/supabase/server";

/** Where a workspace's join link leads (signed in only): ask to join, or see where you stand. */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("join");
  const supabase = await createClient();
  const { data: info } = await supabase.rpc("join_link_info", { p_token: token }).maybeSingle();

  if (!info) {
    return (
      <main className="bg-surface-container-low flex min-h-dvh items-center justify-center p-4">
        <h1 className="sr-only">{t("title", { workspace: "" })}</h1>
        <EmptyState
          size="lg"
          titleAs="h2"
          icon={<Icon name="link_off" />}
          title={t("invalid")}
          actions={
            <Button variant="tonal" href="/">
              {t("goHome")}
            </Button>
          }
        />
      </main>
    );
  }

  const values = { workspace: info.workspace_name };
  // The pending request's id, to withdraw it (RLS shows people their own requests).
  const { data: request } =
    info.request_status === "pending"
      ? await supabase
          .from("join_requests")
          .select("id")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

  return (
    <main className="bg-surface-container-low flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthPanel title={t("title", values)} subtitle={t("subtitle", values)}>
          {info.is_member ? (
            <div className="flex flex-col gap-4">
              <p className="text-body-medium text-on-surface">{t("member", values)}</p>
              <Button variant="filled" href={`/w/${info.workspace_slug}`}>
                {t("open", values)}
              </Button>
            </div>
          ) : (
            <JoinForm
              token={token}
              workspace={info.workspace_name}
              pendingRequestId={request?.id ?? null}
              declinedBefore={info.request_status === "declined"}
            />
          )}
        </AuthPanel>
      </div>
    </main>
  );
}
