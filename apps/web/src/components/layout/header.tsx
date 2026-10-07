"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { TopAppBar, TooltipTrigger, Tooltip, MenuTrigger, Menu, MenuItem, MenuGroup, IconButton, Button as _Btn } from "@vkieu/mui";
import { useAuth } from "@/lib/auth";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { AvatarProgressRing } from "@/components/import/avatar-progress-ring";
import { useImportProgress } from "@/components/import/import-progress-provider";
import { useRoles } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useUserRole } from "@/hooks/use-user-role";

export function Header() {
  const { logout } = useAuth();
  const companyId = useCompanyId();
  const { data: roles = [] } = useRoles(companyId);
  const { role, setRole } = useUserRole();
  const { percent, isActive, progress } = useImportProgress();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _showRing = percent !== null && (isActive || progress?.status === "completed");
  // DEBUG: force the ring on and loop it 0→100% on load to preview the
  // animation. Revert to `_showRing` / `percent` before committing.
  const showRing = true;
  const [debugPercent, setDebugPercent] = useState(0);
  useEffect(() => {
    const stops = [0, 100];
    let i = 0;
    setDebugPercent(0);
    const id = setInterval(() => {
      i = (i + 1) % stops.length;
      setDebugPercent(stops[i]);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const roleOptions = [
    { value: "super_admin", label: "👑 Super Admin" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <TopAppBar
      className="bg-transparent"
      title={<Breadcrumbs />}
      actions={
        <>
          {/* Role view switcher */}
          <TooltipTrigger placement="bottom">
            <div className="hidden lg:flex items-center gap-2">
              <Icon name="visibility" size={18} className="text-on-surface-variant" />
              <Select
                value={role}
                onValueChange={(value) => setRole(value)}
                placeholder="View as..."
                variant="outlined"
                options={roleOptions}
                className="h-9 w-44 text-[13px]"
              />
            </div>
            <Tooltip>Preview as different role</Tooltip>
          </TooltipTrigger>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Search / Command palette */}
          <TooltipTrigger placement="bottom">
            <IconButton
              variant="standard"
              size="sm"
              aria-label="Search"
              className="hidden sm:inline-flex"
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true })
                );
              }}
              icon={<Icon name="search" size={24} />}
            />
            <Tooltip>Search (⌘K)</Tooltip>
          </TooltipTrigger>

          {/* User menu */}
          <div className="relative inline-flex items-center justify-center">
            <MenuTrigger>
              <IconButton
                variant="standard"
                size="sm"
                aria-label={
                  showRing
                    ? `User menu — importing, ${debugPercent}% complete`
                    : "User menu"
                }
                icon={<Avatar size="s" name="User" />}
              />
              <Menu
                placement="bottom end"
                onAction={(key) => {
                  if (key === "sign-out") logout();
                }}
              >
                <MenuItem key="profile">Profile</MenuItem>
                <MenuItem key="settings">Settings</MenuItem>
                <MenuGroup>
                  <MenuItem key="sign-out" className="text-error">Sign out</MenuItem>
                </MenuGroup>
              </Menu>
            </MenuTrigger>
            {showRing && <AvatarProgressRing percent={debugPercent} size={32} />}
          </div>
        </>
      }
    />
  );
}
