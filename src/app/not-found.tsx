import { getTranslations } from "next-intl/server";
import { Button } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

export default async function NotFound() {
  const t = await getTranslations("states");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        size="lg"
        titleAs="h2"
        icon={<Icon name="search_off" />}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        actions={
          <Button variant="tonal" href="/">
            {t("goHome")}
          </Button>
        }
      />
    </main>
  );
}
