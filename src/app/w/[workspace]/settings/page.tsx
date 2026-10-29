import { getTranslations } from "next-intl/server";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

export default async function SettingsIndexPage() {
  const t = await getTranslations("settings");
  return (
    <EmptyState
      titleAs="h2"
      icon={<Icon name="settings" />}
      title={t("chooseTitle")}
      description={t("chooseBody")}
    />
  );
}
