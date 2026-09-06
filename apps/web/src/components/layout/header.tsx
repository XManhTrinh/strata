"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { AppBar } from "@vkieu/mui";
import { useAuth } from "@/lib/auth";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { IconButton } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Tooltip } from "@vkieu/mui";
import { Select } from "@vkieu/mui";
import { Menu, MenuItem, MenuDivider } from "@vkieu/mui";
import { Avatar } from "@/components/ui/avatar";
import { useRoles } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useUserRole } from "@/hooks/use-user-role";

export function Header() {
  const { logout } = useAuth();
  const companyId = useCompanyId();
  const { data: roles = [] } = useRoles(companyId);
  const { role, setRole } = useUserRole();

  const roleOptions = [
    { value: "super_admin", label: "👑 Super Admin" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <AppBar className="bg-transparent">
      <AppBar.Headline>
        <Breadcrumbs />
      </AppBar.Headline>
      <AppBar.Trailing>
        {/* Role view switcher */}
        <Tooltip content="Preview as different role" side="bottom">
          <div className="hidden lg:flex items-center gap-2">
            <Icon name="visibility" size={18} className="text-surface-variant-foreground" />
            <Select
              value={role}
              onValueChange={(value) => setRole(value)}
              placeholder="View as..."
              variant="outlined"
              options={roleOptions}
              className="h-9 w-44 text-[13px]"
            />
          </div>
        </Tooltip>

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
