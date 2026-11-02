import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Button, Card } from "@windmorph/react";
import { Link } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

const FEATURES = [
  { key: "people", icon: "group" },
  { key: "time", icon: "event_available" },
  { key: "orgChart", icon: "account_tree" },
  { key: "planning", icon: "insights" },
  { key: "roles", icon: "admin_panel_settings" },
  { key: "privacy", icon: "shield_person" },
] as const;

const SIZES = [
  { key: "personal", icon: "person" },
  { key: "team", icon: "groups" },
  { key: "company", icon: "apartment" },
] as const;

function BrandMark({ letter, small = false }: { letter: string; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`bg-primary text-on-primary flex items-center justify-center rounded-lg font-bold ${
        small ? "text-label-small size-6" : "text-label-large size-8"
      }`}
    >
      {letter}
    </span>
  );
}

/** What signed-out visitors see at `/`: what Strata is, and the way in. */
export async function LandingPage() {
  const t = await getTranslations("home");
  const tDocs = await getTranslations("docs.nav");

  return (
    <div className="bg-surface min-h-dvh">
      <header className="border-outline-variant bg-surface/90 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <NextLink href="/" className="flex items-center gap-2">
            <BrandMark letter={t("title").charAt(0)} />
            <span className="text-title-medium text-on-surface">{t("title")}</span>
          </NextLink>
          <nav aria-label={t("title")} className="flex items-center gap-2">
            <Button variant="text" href="/sign-in">
              {t("signIn")}
            </Button>
            <Button variant="filled" href="/sign-up">
              {t("getStarted")}
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-display-small sm:text-display-medium text-on-surface tracking-tight">
              {t("headline")}
            </h1>
            <p className="text-body-large text-on-surface-variant mt-6 max-w-2xl">
              {t("subtitle")}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button variant="filled" href="/sign-up">
                {t("getStarted")}
              </Button>
              <Button variant="outlined" href="#features">
                {t("seeFeatures")}
              </Button>
            </div>
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-title"
          className="border-outline-variant bg-surface-container-low scroll-mt-16 border-t py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="features-title" className="text-headline-large text-on-surface text-center">
              {t("featuresTitle")}
            </h2>
            <p className="text-body-large text-on-surface-variant mx-auto mt-4 max-w-xl text-center">
              {t("featuresIntro")}
            </p>
            <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.key}>
                  <Card variant="outlined" className="h-full p-6">
                    <span className="bg-primary-container text-on-primary-container mb-4 flex size-12 items-center justify-center rounded-full">
                      <Icon name={f.icon} />
                    </span>
                    <h3 className="text-title-medium text-on-surface">
                      {t(`features.${f.key}.title`)}
                    </h3>
                    <p className="text-body-medium text-on-surface-variant mt-2">
                      {t(`features.${f.key}.body`)}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="sizes-title" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="sizes-title" className="text-headline-large text-on-surface text-center">
              {t("sizesTitle")}
            </h2>
            <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
              {SIZES.map((s) => (
                <li key={s.key} className="flex items-start gap-4">
                  <span className="bg-secondary-container text-on-secondary-container flex size-10 shrink-0 items-center justify-center rounded-full">
                    <Icon name={s.icon} />
                  </span>
                  <div>
                    <h3 className="text-title-medium text-on-surface">
                      {t(`sizes.${s.key}.title`)}
                    </h3>
                    <p className="text-body-medium text-on-surface-variant mt-1">
                      {t(`sizes.${s.key}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="cta-title"
          className="border-outline-variant bg-surface-container-low border-t py-20"
        >
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 id="cta-title" className="text-headline-large text-on-surface">
              {t("ctaTitle")}
            </h2>
            <p className="text-body-large text-on-surface-variant mx-auto mt-4 max-w-lg">
              {t("ctaBody")}
            </p>
            <div className="mt-8">
              <Button variant="filled" href="/sign-up">
                {t("getStarted")}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-outline-variant border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <BrandMark letter={t("title").charAt(0)} small />
            <span className="text-body-small text-on-surface-variant">
              {t("footer", { year: new Date().getFullYear() })}
            </span>
          </div>
          <nav aria-label={tDocs("label")} className="flex flex-wrap justify-center gap-4">
            <Link href="/help">{tDocs("help")}</Link>
            <Link href="/legal/privacy">{tDocs("privacy")}</Link>
            <Link href="/legal/terms">{tDocs("terms")}</Link>
            <Link href="/legal/sub-processors">{tDocs("subProcessors")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
