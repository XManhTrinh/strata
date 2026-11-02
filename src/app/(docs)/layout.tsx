import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@windmorph/react-pro";

/** Help and legal pages: public, readable signed in or out. */
export default async function DocsLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("docs.nav");
  return (
    <div className="bg-surface flex min-h-dvh flex-col">
      <header className="border-outline-variant flex items-center gap-6 border-b px-4 py-3 sm:px-6">
        <Link href="/" className="text-title-large text-on-surface">
          {t("home")}
        </Link>
        <nav aria-label={t("label")} className="ml-auto flex gap-4">
          <Link href="/help">{t("help")}</Link>
          <Link href="/legal/privacy">{t("privacy")}</Link>
          <Link href="/legal/terms">{t("terms")}</Link>
        </nav>
      </header>
      <main className="max-w-form w-full px-4 py-8 sm:px-6 lg:mx-auto">{children}</main>
    </div>
  );
}
