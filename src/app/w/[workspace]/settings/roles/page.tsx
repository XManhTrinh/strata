import { getTranslations } from "next-intl/server";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

/** Beside the roles on large screens, before one is chosen (smaller screens show the list). */
export default async function RolesSettingsPage() {
  const t = await getTranslations("roles");
  return (
    <EmptyState
      titleAs="h2"
      icon={<Icon name="admin_panel_settings" />}
      title={t("chooseTitle")}
      description={t("chooseBody")}
    />
  );
}
