"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton, List, ListItem, TopAppBar } from "@windmorph/react";
import { ListDetailLayout } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";

const SECTIONS = [
  { key: "profile", icon: "person" },
  { key: "notifications", icon: "notifications" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

/** Personal settings, outside any workspace. Same list-detail pattern as workspace settings. */
export function AccountShell({ children }: { children: ReactNode }) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const router = useRouter();
  const current = pathname.split("/")[2] as SectionKey | undefined;

  return (
    <div className="bg-surface text-on-surface min-h-dvh">
      <TopAppBar
        title={t("title")}
        navigationIcon={
          <IconButton
            variant="standard"
            href="/"
            aria-label={t("back")}
            icon={<Icon name="arrow_back" />}
          />
        }
      />
      <main id="main-content">
        <ListDetailLayout
          active={current ? "detail" : "list"}
          detailKey={pathname}
          listLabel={t("title")}
          detailLabel={current ? t(`sections.${current}.name`) : t("title")}
          listAs="nav"
          back={
            <IconButton
              variant="standard"
              href="/account"
              aria-label={t("title")}
              icon={<Icon name="arrow_back" />}
            />
          }
          list={
            <List
              aria-label={t("title")}
              selectionMode="single"
              selectedKeys={current ? [current] : []}
              onSelectionChange={(keys) => {
                const [key] = keys === "all" ? [] : [...keys];
                if (key && key !== current) router.push(`/account/${String(key)}`);
              }}
            >
              {SECTIONS.map((section) => (
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
          }
          detail={<div className="medium:p-6 p-4">{children}</div>}
        />
      </main>
    </div>
  );
}
