import { getTranslations } from "next-intl/server";
import { DashboardPage } from "@/features/workspaces/components/dashboard-page";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default function WorkspaceHomePage() {
  return <DashboardPage />;
}
