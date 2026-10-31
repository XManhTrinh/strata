"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton, List, ListItem } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { PageHeader } from "@/components/shell/page-header";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { type SettingsSectionKey, visibleSections } from "../sections";

/**
 * Settings. From 600px the navigation rail's panel lists the sections, so the page shows the
 * open one. On phones the page lists the sections, and an open section offers a way back
 * (workspace settings ask for a larger screen there).
 */
export function SettingsShell({ children }: { children: ReactNode }) {
  const t = useTranslations("settings");
  const pathname = usePathname();
  const { workspace, permissions } = useWorkspace();
  const base = `/w/${workspace.slug}/settings`;
  const current = pathname.slice(base.length + 1).split("/")[0] as SettingsSectionKey | "";

  return (
    <>
      <PageHeader
        // Each section names itself in its own heading.
        title={t("title")}
        actions={
          current ? (
            <IconButton
              variant="standard"
              href={base}
              aria-label={t("back")}
              icon={<Icon name="arrow_back" />}
              className="medium:hidden"
            />
          ) : undefined
        }
      />
      {current ? (
        <div className="medium:px-6 px-4 pb-6">
          <div className="medium:hidden py-4">
            <EmptyState
              titleAs="h2"
              icon={<Icon name="devices" />}
              title={t("largerScreenTitle")}
              description={t("largerScreenBody")}
            />
          </div>
          <div className="medium:block hidden">{children}</div>
        </div>
      ) : (
        <>
          <nav aria-label={t("title")} className="medium:hidden px-2 pb-6">
            <List aria-label={t("title")}>
              {visibleSections(permissions).map((section) => (
                <ListItem
                  key={section.key}
                  href={`${base}/${section.key}`}
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
    </>
  );
}
