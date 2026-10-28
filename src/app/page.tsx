import { getTranslations } from "next-intl/server";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-display-medium text-on-surface">{t("title")}</h1>
      <p className="text-body-large text-on-surface-variant max-w-prose text-center">
        {t("subtitle")}
      </p>
      <EmptyState
        variant="filled"
        size="md"
        icon={<Icon name="check_circle" />}
        title={t("status")}
      />
    </main>
  );
}
