"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton, List, ListItem } from "@windmorph/react";
import { EmptyState, ListDetailLayout } from "@windmorph/react-pro";
import { PageHeader } from "@/components/shell/page-header";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { type SettingsSectionKey, visibleSections } from "../sections";

/**
 * Material 3 list-detail: sections and the open section side by side from 600px; on phones one
 * pane at a time, and workspace settings ask for a larger screen.
 */
export function SettingsShell({ children }: { children: ReactNode }) {
  const t = useTranslations("settings");
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, permissions } = useWorkspace();
  const base = `/w/${workspace.slug}/settings`;
  const sections = visibleSections(permissions);
  const current = pathname.slice(base.length + 1).split("/")[0] as SettingsSectionKey | "";
  const active = current ? "detail" : "list";

  return (
    <>
      <PageHeader title={t("title")} />
      <ListDetailLayout
        active={active}
        detailKey={pathname}
        listLabel={t("title")}
        detailLabel={current ? t(`sections.${current}.name`) : t("title")}
        listAs="nav"
        back={
          <IconButton
            variant="standard"
            href={base}
            aria-label={t("back")}
            icon={<Icon name="arrow_back" />}
          />
        }
        list={
          <List
            aria-label={t("title")}
            selectionMode="single"
            // In selection mode a click selects rather than following the link, so navigate here.
            onSelectionChange={(keys) => {
              const [key] = keys === "all" ? [] : [...keys];
              if (key && key !== current) router.push(`${base}/${String(key)}`);
            }}
            selectedKeys={current ? [current] : []}
          >
            {sections.map((section) => (
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
        }
        detail={
          <>
            <div className="medium:hidden p-4">
              <EmptyState
                titleAs="h2"
                icon={<Icon name="devices" />}
                title={t("largerScreenTitle")}
                description={t("largerScreenBody")}
              />
            </div>
            <div className="medium:block hidden p-6">{children}</div>
          </>
        }
      />
    </>
  );
}
