import { getTranslations } from "next-intl/server";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export default async function SignUpPage() {
  const t = await getTranslations("auth.signUp");

  return (
    <AuthPanel title={t("title")} subtitle={t("subtitle")}>
      <SignUpForm />
    </AuthPanel>
  );
}
