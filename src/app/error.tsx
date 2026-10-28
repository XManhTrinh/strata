"use client";

import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("states");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        size="lg"
        color="error"
        titleAs="h2"
        icon={<Icon name="error" />}
        title={t("errorTitle")}
        description={t("errorDescription")}
        actions={
          <Button variant="filled" onPress={reset}>
            {t("retry")}
          </Button>
        }
      />
    </main>
  );
}
