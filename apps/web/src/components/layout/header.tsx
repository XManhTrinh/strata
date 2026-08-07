"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { AppBar } from "./app-bar";
import { useTheme } from "@/lib/theme";
import { useUserRole, type UserRoleView } from "@/hooks/use-user-role";
import { useSidebar } from "@/hooks/use-sidebar";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { Button } from "@/components/ui/button";
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
  const { theme, setTheme } = useTheme();
  const { role, setRole } = useUserRole();
  const { setMobileOpen } = useSidebar();

  return (
    <AppBar className="sticky top-0 z-30 h-16 justify-between bg-card/80 backdrop-blur-sm px-6">
      {/* Left: Mobile menu trigger + Breadcrumbs */}
      <div className="flex items-center gap-2">
        {/* Mobile menu trigger — visible only on <768px */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden min-w-11 min-h-11"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <span aria-hidden="true" className="text-lg">☰</span>
        </Button>

        <Breadcrumbs />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Role switcher */}
        <div className="flex items-center gap-1">
          {(["super_admin", "manager", "user"] as UserRoleView[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors min-w-11 min-h-11 flex items-center justify-center ${
                role === r
                  ? roleColors[r]
                  : "text-muted-foreground hover:bg-secondary"
              }`}
              title={`Switch to ${roleLabels[r]} view`}
            >
              {roleLabels[r]}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="min-w-11 min-h-11"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </Button>

        {/* Notification dropdown */}
        <NotificationDropdown />

        {/* Command palette shortcut hint */}
        <Button
          variant="outline"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground min-h-11"
          aria-label="Open command palette"
          title="Open command palette (⌘K)"
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
        >
          <span>Search...</span>
          <kbd className="rounded border border-border px-1 py-0.5 text-[10px] font-mono">
            ⌘K
          </kbd>
        </Button>

        {/* User menu — DropdownMenu with Avatar trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="min-w-11 min-h-11 rounded-full"
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
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </AppBar>
  );
}
