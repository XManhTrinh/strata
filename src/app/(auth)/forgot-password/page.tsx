import { getTranslations } from "next-intl/server";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgot");

  return (
    <AuthPanel title={t("title")} subtitle={t("subtitle")}>
      <ForgotPasswordForm />
    </AuthPanel>
  );
}
