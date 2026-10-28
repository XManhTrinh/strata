import { getTranslations } from "next-intl/server";
import { LoadingIndicator } from "@windmorph/react";

export default async function Loading() {
  const t = await getTranslations("states");

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingIndicator aria-label={t("loading")} />
    </div>
  );
}
