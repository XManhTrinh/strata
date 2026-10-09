"use client";

import type { RefObject } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import {
  TopAppBar,
  TooltipTrigger,
  Tooltip,
  MenuTrigger,
  Menu,
  MenuItem,
  MenuGroup,
  IconButton,
  Select,
  SelectItem,
  type TopAppBarScrollBehavior,
} from "@vkieu/mui";
import { useAuth } from "@/lib/auth";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@vkieu/mui/vk";
import { AvatarProgressRing } from "@/components/import/avatar-progress-ring";
import { useImportProgress } from "@/components/import/import-progress-provider";
import { useRoles } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useUserRole } from "@/hooks/use-user-role";

export interface HeaderProps {
  /** Forwarded to the internal `TopAppBar`, carrying sticky/visibility classes. */
  className?: string;
  /** Forwarded to the internal `TopAppBar`; `"pinned"` supplies the opaque surface fill. */
  scrollBehavior?: TopAppBarScrollBehavior;
  /** The scroll container the pinned fill responds to (Strata scrolls inside `<main>`). */
  scrollRef?: RefObject<HTMLElement | null>;
}

export function Header({ className, scrollBehavior, scrollRef }: HeaderProps) {
  const { logout } = useAuth();
  const companyId = useCompanyId();
  const { data: roles = [] } = useRoles(companyId);
  const { role, setRole } = useUserRole();
  const { percent, isActive, progress } = useImportProgress();
  const showRing = percent !== null && (isActive || progress?.status === "completed");

  const roleOptions = [
    { value: "super_admin", label: "👑 Super Admin" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <TopAppBar
      className={className}
      scrollBehavior={scrollBehavior}
      scrollRef={scrollRef}
      title={<Breadcrumbs />}
      actions={
        <>
          {/* Role view switcher */}
          <TooltipTrigger placement="bottom">
            <div className="hidden lg:flex items-center gap-2">
              <Icon name="visibility" size={18} className="text-on-surface-variant" />
              <Select
                aria-label="View as role"
                selectedKey={role}
                onSelectionChange={(key) => setRole(key == null ? "" : String(key))}
                placeholder="View as..."
                variant="outlined"
                className="h-9 w-44 text-[13px]"
              >
                {roleOptions.map((o) => (
                  <SelectItem key={o.value}>{o.label}</SelectItem>
                ))}
              </Select>
            </div>
            <Tooltip>Preview as different role</Tooltip>
          </TooltipTrigger>

          {/* Notifications */}
          <NotificationPanel />

          {/* User menu */}
          <div className="relative inline-flex items-center justify-center">
            <MenuTrigger>
              <IconButton
                variant="standard"
                size="sm"
                aria-label={
                  showRing
                    ? `User menu — importing, ${percent}% complete`
                    : "User menu"
                }
                icon={<Avatar size="sm" name="User" decorative />}
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
            {showRing && percent !== null && <AvatarProgressRing percent={percent} size={32} />}
          </div>
        </>
      }
    />
  );
}
