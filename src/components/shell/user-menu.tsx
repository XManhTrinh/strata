"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  IconButton,
  Menu,
  MenuGroup,
  MenuItem,
  MenuTrigger,
  SubmenuTrigger,
  useTheme,
} from "@windmorph/react";
import { Avatar } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { signOut } from "@/features/auth/actions";
import { useWorkspace } from "@/features/workspaces/workspace-context";

const MODES = ["light", "dark", "system"] as const;

export function UserMenu() {
  const t = useTranslations("shell.userMenu");
  const router = useRouter();
  const { user } = useWorkspace();
  const { mode, setMode } = useTheme();
  const [, startTransition] = useTransition();

  function onAction(key: string) {
    if (key === "profile") router.push("/account/profile");
    else if (key === "notifications") router.push("/account/notifications");
    else if (key === "sign-out") startTransition(() => signOut());
  }

  return (
    <MenuTrigger>
      <IconButton
        aria-label={t("label")}
        icon={<Avatar name={user.fullName} decorative size="sm" />}
      />
      <Menu aria-label={t("label")} onAction={(key) => onAction(String(key))}>
        <MenuGroup>
          <MenuItem key="profile" leadingIcon={<Icon name="person" />}>
            {t("profile")}
          </MenuItem>
          <MenuItem key="notifications" leadingIcon={<Icon name="notifications" />}>
            {t("notifications")}
          </MenuItem>
          <SubmenuTrigger>
            <MenuItem key="theme" leadingIcon={<Icon name="contrast" />}>
              {t("theme")}
            </MenuItem>
            <Menu
              aria-label={t("theme")}
              onAction={(key) => setMode(key as (typeof MODES)[number])}
            >
              {MODES.map((m) => (
                <MenuItem key={m} leadingIcon={<Icon name={mode === m ? "check" : "blank"} />}>
                  {t(m)}
                </MenuItem>
              ))}
            </Menu>
          </SubmenuTrigger>
        </MenuGroup>
        <MenuGroup>
          <MenuItem key="sign-out" leadingIcon={<Icon name="logout" />}>
            {t("signOut")}
          </MenuItem>
        </MenuGroup>
      </Menu>
    </MenuTrigger>
  );
}
