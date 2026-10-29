import type { ReactNode } from "react";
import { Card } from "@windmorph/react";

/** The card every sign-in screen sits in: a heading, an optional line under it, then the form. */
export function AuthPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card variant="elevated" className="flex flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-headline-small text-on-surface">{title}</h1>
        {subtitle && <p className="text-body-large text-on-surface-variant">{subtitle}</p>}
      </header>
      {children}
    </Card>
  );
}
