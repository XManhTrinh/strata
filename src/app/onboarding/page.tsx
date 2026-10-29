import { getTranslations } from "next-intl/server";
import { Card } from "@windmorph/react";
import { OnboardingForm } from "@/features/workspaces/components/onboarding-form";
import { getPublicEnv } from "@/lib/env";

export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");
  const siteHost = new URL(getPublicEnv().NEXT_PUBLIC_SITE_URL).host;

  return (
    <main className="bg-surface-container-low flex min-h-dvh justify-center p-4 sm:items-center">
      <Card variant="elevated" className="flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-headline-small text-on-surface">{t("title")}</h1>
          <p className="text-body-large text-on-surface-variant">{t("subtitle")}</p>
        </header>
        <OnboardingForm siteHost={siteHost} />
      </Card>
    </main>
  );
}
