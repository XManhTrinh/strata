import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { DocArticle } from "@/features/docs/doc-article";
import {
  type DocSection,
  LEGAL_PAGES,
  LEGAL_UPDATED,
  type LegalPage,
  OPERATOR,
} from "@/features/docs/pages";

type Params = { params: Promise<{ page: string }> };

function isPage(value: string): value is LegalPage {
  return (LEGAL_PAGES as readonly string[]).includes(value);
}

/** Fills in who operates Strata ({company}, {companyCountry}, {email}). */
function withOperator(text: string): string {
  return text.replace(
    /\{(company|companyCountry|email)\}/g,
    (_, key: keyof typeof OPERATOR) => OPERATOR[key]
  );
}

export function generateStaticParams() {
  return LEGAL_PAGES.map((page) => ({ page }));
}

export async function generateMetadata({ params }: Params) {
  const { page } = await params;
  if (!isPage(page)) return {};
  const t = await getTranslations("docs.legal.pages");
  return { title: t(`${page}.title`) };
}

export default async function LegalPageView({ params }: Params) {
  const { page } = await params;
  if (!isPage(page)) notFound();
  const t = await getTranslations("docs.legal");
  const format = await getFormatter();
  const sections = (t.raw(`pages.${page}.sections`) as DocSection[]).map((s) => ({
    heading: s.heading,
    body: s.body.map(withOperator),
  }));
  return (
    <DocArticle
      title={t(`pages.${page}.title`)}
      summary={
        <>
          {t(`pages.${page}.summary`)}{" "}
          {t("updated", { date: format.dateTime(new Date(LEGAL_UPDATED), { dateStyle: "long" }) })}
        </>
      }
      sections={sections}
    />
  );
}
