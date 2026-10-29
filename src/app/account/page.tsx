import { getTranslations } from "next-intl/server";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

export default async function AccountIndexPage() {
  const t = await getTranslations("settings");
  return (
    <EmptyState
      titleAs="h2"
      icon={<Icon name="person" />}
      title={t("chooseTitle")}
      description={t("chooseBody")}
    />
  );
}
