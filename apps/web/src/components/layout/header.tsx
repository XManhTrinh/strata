"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { AppBar } from "@strata/mui";
import { useUserRole, type UserRoleView } from "@/hooks/use-user-role";
import { useAuth } from "@/lib/auth";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { IconButton } from "@strata/mui/buttons";
import { Icon } from "@strata/mui";
import { Tooltip } from "@strata/mui";
import { Chip } from "@strata/mui";
import { Menu, MenuItem, MenuDivider } from "@strata/mui";
import { Avatar } from "@/components/ui/avatar";

const roleLabels: Record<UserRoleView, string> = {
  super_admin: "Super Admin",
  manager: "Manager / HR",
  user: "Employee",
};

export function Header() {
  const { role, setRole } = useUserRole();
  const { logout } = useAuth();

  return (
    <AppBar
      headline={<Breadcrumbs />}
      trailingIcons={
        <>
          {/* Role switcher — dev only */}
          <div className="hidden lg:flex items-center gap-1 mr-2">
            {(["super_admin", "manager", "user"] as UserRoleView[]).map((r) => (
              <Tooltip key={r} content={`Switch to ${roleLabels[r]} view`} side="bottom">
                <Chip
                  variant="filter"
                  selected={role === r}
                  onClick={() => setRole(r)}
                >
                  {roleLabels[r]}
                </Chip>
              </Tooltip>
            ))}
          </div>

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
        </>
      }
    />
  );
}
