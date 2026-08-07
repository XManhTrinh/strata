"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { TopAppBar } from "@/components/ui/top-app-bar";
import { useUserRole, type UserRoleView } from "@/hooks/use-user-role";
import { useAuth } from "@/lib/auth";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const roleLabels: Record<UserRoleView, string> = {
  super_admin: "Super Admin",
  manager: "Manager / HR",
  user: "Employee",
};

const roleColors: Record<UserRoleView, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  user: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function Header() {
  const { role, setRole } = useUserRole();
  const { logout } = useAuth();

  return (
    <TopAppBar
      headline={<Breadcrumbs />}
      trailingIcons={
        <>
          {/* Role switcher — dev only */}
          <div className="hidden lg:flex items-center gap-0.5 mr-2">
            {(["super_admin", "manager", "user"] as UserRoleView[]).map((r) => (
              <Tooltip key={r} content={`Switch to ${roleLabels[r]} view`} side="bottom">
                <button
                  onClick={() => setRole(r)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    role === r
                      ? roleColors[r]
                      : "text-muted-foreground hover:bg-[hsl(var(--on-surface)/0.08)]"
                  }`}
                >
                  {roleLabels[r]}
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Search / Command palette */}
          <Tooltip content="Search (⌘K)" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              aria-label="Search"
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true })
                );
              }}
            >
              <Icon name="search" size={24} />
            </Button>
          </Tooltip>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="User avatar" />
                  <AvatarFallback className="bg-primary/20 text-sm font-medium text-primary">
                    U
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => logout()}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
