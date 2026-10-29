import { getTranslations } from "next-intl/server";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { safeNextPath } from "@/lib/safe-next-path";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const t = await getTranslations("auth.signUp");

  return (
    <AuthPanel title={t("title")} subtitle={t("subtitle")}>
      <SignUpForm next={next ? safeNextPath(next) : undefined} />
    </AuthPanel>
  );
}
