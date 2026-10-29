"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton, Menu, MenuGroup, MenuItem, MenuTrigger } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";

const CREATE_KEY = "__create";

export function WorkspaceSwitcher() {
  const t = useTranslations("shell.switcher");
  const router = useRouter();
  const { workspace, workspaces } = useWorkspace();

  return (
    <MenuTrigger>
      <IconButton variant="standard" aria-label={t("label")} icon={<Icon name="swap_horiz" />} />
      <Menu
        aria-label={t("label")}
        onAction={(key) => router.push(key === CREATE_KEY ? "/onboarding" : `/w/${String(key)}`)}
      >
        <MenuGroup>
          {workspaces.map((w) => (
            <MenuItem
              key={w.slug}
              textValue={w.name}
              leadingIcon={<Icon name={w.id === workspace.id ? "check" : "workspaces"} />}
            >
              {w.name}
            </MenuItem>
          ))}
        </MenuGroup>
        <MenuGroup>
          <MenuItem key={CREATE_KEY} leadingIcon={<Icon name="add" />}>
            {t("create")}
          </MenuItem>
        </MenuGroup>
      </Menu>
    </MenuTrigger>
  );
}
