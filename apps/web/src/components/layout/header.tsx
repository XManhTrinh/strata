"use client";

import { useState } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { AppBar } from "./app-bar";
import { useTheme } from "@/lib/theme";
import { useUserRole, type UserRoleView } from "@/hooks/use-user-role";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const { role, setRole } = useUserRole();

  return (
    <AppBar className="sticky top-0 z-30 h-16 justify-between bg-card/80 backdrop-blur-sm px-6">
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Dev: Role switcher */}
        {process.env.NODE_ENV === "development" && (
          <div className="flex items-center gap-1">
            {(["super_admin", "manager", "user"] as UserRoleView[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
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
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Notification dropdown */}
        <NotificationDropdown />

        {/* Command palette shortcut hint */}
        <button
          className="hidden sm:flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Open command palette"
          title="Open command palette (⌘K)"
          onClick={() => {
            // Dispatch a keyboard event to open the command palette
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
        >
          <span>Search...</span>
          <kbd className="rounded border border-border px-1 py-0.5 text-[10px] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary transition-colors"
            aria-label="User menu"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              U
            </div>
          </button>
          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-card shadow-lg py-1 z-50"
              role="menu"
            >
              <button
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                role="menuitem"
                onClick={() => setShowUserMenu(false)}
              >
                Profile
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                role="menuitem"
                onClick={() => setShowUserMenu(false)}
              >
                Settings
              </button>
              <hr className="my-1 border-border" />
              <button
                className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
                role="menuitem"
                onClick={() => setShowUserMenu(false)}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </AppBar>
  );
}
