"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton, List, ListItem } from "@windmorph/react";
import { PageHeader } from "@/components/shell/page-header";
import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { Icon } from "@/components/ui/icon";
import {
  type WorkspaceContextValue,
  WorkspaceProvider,
} from "@/features/workspaces/workspace-context";
import { ACCOUNT_SECTIONS, type AccountSectionKey } from "./account-sections";

/**
 * Personal settings in the frame of the workspace used last, so the navigation stays at hand:
 * from 600px the panel beside the rail lists the sections; on phones the page lists them and an
 * open section has a way back.
 */
export function AccountFrame({
  context,
  children,
}: {
  context: WorkspaceContextValue;
  children: ReactNode;
}) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const current = pathname.split("/")[2] as AccountSectionKey | undefined;
  const links = ACCOUNT_SECTIONS.map((s) => ({
    href: `/account/${s.key}`,
    label: t(`sections.${s.key}.name`),
  }));

  return (
    <WorkspaceProvider value={context}>
      <WorkspaceShell panel={{ key: "account", heading: t("title"), label: t("title"), links }}>
        <PageHeader
          title={t("title")}
          actions={
            current ? (
              <IconButton
                variant="standard"
                href="/account"
                aria-label={t("backToAccount")}
                icon={<Icon name="arrow_back" />}
                className="medium:hidden"
              />
            ) : undefined
          }
        />
        {current ? (
          <div className="medium:px-6 px-4 pb-6">{children}</div>
        ) : (
          <>
            <nav aria-label={t("title")} className="medium:hidden px-2 pb-6">
              <List aria-label={t("title")}>
                {ACCOUNT_SECTIONS.map((section) => (
                  <ListItem
                    key={section.key}
                    href={`/account/${section.key}`}
                    leading={<Icon name={section.icon} />}
                    supportingText={t(`sections.${section.key}.description`)}
                    textValue={t(`sections.${section.key}.name`)}
                  >
                    {t(`sections.${section.key}.name`)}
                  </ListItem>
                ))}
              </List>
            </nav>
            <div className="medium:block hidden px-6 pb-6">{children}</div>
          </>
        )}
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}
