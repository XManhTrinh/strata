"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { AppBar } from "@vkieu/mui";
import { useAuth } from "@/lib/auth";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { IconButton } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Tooltip } from "@vkieu/mui";
import { Menu, MenuItem, MenuDivider } from "@vkieu/mui";
import { Avatar } from "@/components/ui/avatar";

export function Header() {
  const { logout } = useAuth();

  return (
    <AppBar>
      <AppBar.Headline>
        <Breadcrumbs />
      </AppBar.Headline>
      <AppBar.Trailing>
        {/* Notifications */}
        <NotificationDropdown />

        {/* Search / Command palette */}
        <Tooltip content="Search (⌘K)" side="bottom">
          <IconButton
            variant="standard"
            size="s"
            aria-label="Search"
            className="hidden sm:inline-flex"
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
          >
            <Icon name="search" size={24} />
          </IconButton>
        </Tooltip>

        {/* User menu */}
        <Menu
          align="end"
          trigger={
            <IconButton
              variant="standard"
              size="s"
              aria-label="User menu"
            >
              <Avatar size="s" name="User" />
            </IconButton>
          }
        >
          <MenuItem onSelect={() => {}}>Profile</MenuItem>
          <MenuItem onSelect={() => {}}>Settings</MenuItem>
          <MenuDivider />
          <MenuItem className="text-error" onSelect={() => logout()}>
            Sign out
          </MenuItem>
        </Menu>
      </AppBar.Trailing>
    </AppBar>
  );
}
