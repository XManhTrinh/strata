import { getTranslations } from "next-intl/server";
import { List, ListItem } from "@windmorph/react";
import { HELP_TOPICS } from "@/features/docs/pages";

export async function generateMetadata() {
  const t = await getTranslations("docs.help");
  return { title: t("title") };
}

export default async function HelpPage() {
  const t = await getTranslations("docs.help");
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-headline-large text-on-surface">{t("title")}</h1>
        <p className="text-body-large text-on-surface-variant">{t("intro")}</p>
      </header>
      <List aria-label={t("title")}>
        {HELP_TOPICS.map((topic) => (
          <ListItem
            key={topic}
            href={`/help/${topic}`}
            supportingText={t(`topics.${topic}.summary`)}
          >
            {t(`topics.${topic}.title`)}
          </ListItem>
        ))}
      </List>
    </div>
  );
}
