"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Badge,
  BadgedBox,
  IconButton,
  Menu,
  MenuGroup,
  MenuItem,
  MenuTrigger,
} from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useUnreadElsewhere } from "@/features/notifications/use-unread-elsewhere";
import { useWorkspace } from "@/features/workspaces/workspace-context";

const CREATE_KEY = "__create";

export function WorkspaceSwitcher() {
  const t = useTranslations("shell.switcher");
  const router = useRouter();
  const { workspace, workspaces } = useWorkspace();
  // Unread elsewhere: a dot on the button, a count beside each workspace.
  const unread = useUnreadElsewhere();
  const elsewhere = [...unread.values()].reduce((sum, n) => sum + n, 0);
  const icon = <Icon name="swap_horiz" />;

  return (
    <MenuTrigger>
      <IconButton
        variant="standard"
        aria-label={elsewhere > 0 ? t("labelUnread", { count: elsewhere }) : t("label")}
        icon={elsewhere > 0 ? <BadgedBox badge={<Badge />}>{icon}</BadgedBox> : icon}
      />
      <Menu
        placement="bottom-end"
        aria-label={t("label")}
        onAction={(key) => router.push(key === CREATE_KEY ? "/onboarding" : `/w/${String(key)}`)}
      >
        <MenuGroup>
          {workspaces.map((w) => (
            <MenuItem
              key={w.slug}
              textValue={w.name}
              leadingIcon={
                w.id === workspace.id ? (
                  <Icon name="check" />
                ) : w.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link
                  <img src={w.logoUrl} alt="" className="size-6 rounded-md object-cover" />
                ) : (
                  <Icon name="workspaces" />
                )
              }
              badge={
                (unread.get(w.id) ?? 0) > 0 ? (
                  <Badge max={99} label={t("unread", { count: unread.get(w.id) ?? 0 })}>
                    {unread.get(w.id)}
                  </Badge>
                ) : undefined
              }
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
