import type { ReactNode } from "react";
import type { DocSection } from "./pages";

/** A help or legal page: a title, a line under it, then headed sections of paragraphs. */
export function DocArticle({
  title,
  summary,
  sections,
  children,
}: {
  title: string;
  summary: ReactNode;
  sections: DocSection[];
  children?: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-headline-large text-on-surface">{title}</h1>
        <p className="text-body-large text-on-surface-variant">{summary}</p>
      </header>
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-title-large text-on-surface">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="text-body-large text-on-surface">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      {children}
    </article>
  );
}
