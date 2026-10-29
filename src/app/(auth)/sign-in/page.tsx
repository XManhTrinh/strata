import { getTranslations } from "next-intl/server";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { isErrorKey } from "@/lib/form-state";
import { safeNextPath } from "@/lib/safe-next-path";
import messages from "@/messages/en.json";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const t = await getTranslations("auth.signIn");

  return (
    <AuthPanel title={t("title")} subtitle={t("subtitle")}>
      <SignInForm
        next={safeNextPath(next)}
        initialError={isErrorKey(error, Object.keys(messages.errors)) ? error : undefined}
      />
    </AuthPanel>
  );
}
