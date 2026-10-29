import { getTranslations } from "next-intl/server";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";

export default async function UpdatePasswordPage() {
  const t = await getTranslations("auth.update");

  return (
    <AuthPanel title={t("title")}>
      <UpdatePasswordForm />
    </AuthPanel>
  );
}
