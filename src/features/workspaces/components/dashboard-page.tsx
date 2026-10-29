"use client";

import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { PageHeader } from "@/components/shell/page-header";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "../workspace-context";

/** Placeholder until the role dashboards arrive in Phase 5. */
export function DashboardPage() {
  const t = useTranslations("dashboard");
  const { workspace, user } = useWorkspace();

  return (
    <>
      <PageHeader title={workspace.name} />
      <div className="flex flex-col gap-6 p-4 medium:p-6">
        <h2 className="text-headline-small text-on-surface">
          {t("welcome", { name: user.fullName })}
        </h2>
        <EmptyState
          variant="filled"
          size="lg"
          titleAs="h3"
          icon={<Icon name="rocket_launch" />}
          title={t("comingTitle")}
          description={t("comingBody")}
          actions={
            <Button variant="filled" href={`/w/${workspace.slug}/settings`}>
              {t("openSettings")}
            </Button>
          }
        />
      </div>
    </>
  );
}
