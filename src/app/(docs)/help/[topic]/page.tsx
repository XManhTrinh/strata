import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@windmorph/react-pro";
import { DocArticle } from "@/features/docs/doc-article";
import { type DocSection, HELP_TOPICS, type HelpTopic } from "@/features/docs/pages";

type Params = { params: Promise<{ topic: string }> };

function isTopic(value: string): value is HelpTopic {
  return (HELP_TOPICS as readonly string[]).includes(value);
}

export function generateStaticParams() {
  return HELP_TOPICS.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: Params) {
  const { topic } = await params;
  if (!isTopic(topic)) return {};
  const t = await getTranslations("docs.help.topics");
  return { title: t(`${topic}.title`) };
}

export default async function HelpTopicPage({ params }: Params) {
  const { topic } = await params;
  if (!isTopic(topic)) notFound();
  const t = await getTranslations("docs");
  return (
    <DocArticle
      title={t(`help.topics.${topic}.title`)}
      summary={t(`help.topics.${topic}.summary`)}
      sections={t.raw(`help.topics.${topic}.sections`) as DocSection[]}
    >
      <Link href="/help">{t("backToHelp")}</Link>
    </DocArticle>
  );
}
