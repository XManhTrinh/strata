"use client";

import { useTheme } from "@/lib/theme";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import {
  NavigationRail,
  type NavigationRailItem,
} from "@/components/ui/navigation-rail";

/**
 * Primary rail items — one per key section (max 7)
 * Items with children open the navigation drawer on hover.
 */
const railItems: NavigationRailItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  {
    label: "People",
    href: "/people",
    icon: "person",
    children: [
      { label: "People", href: "/people", icon: "person" },
      { label: "Employees", href: "/employees", icon: "group" },
    ],
  },
  { label: "Org Chart", href: "/org-chart", icon: "account_tree" },
  {
    label: "Engineering",
    href: "/engineering",
    icon: "engineering",
    children: [
      { label: "Teams", href: "/engineering", icon: "engineering" },
      { label: "Capacity", href: "/capacity", icon: "trending_up" },
    ],
  },
  { label: "Budgets", href: "/budgets", icon: "payments" },
  {
    label: "Settings",
    href: "/settings",
    icon: "settings",
    children: [
      { label: "Org Structure", href: "/settings/org-structure", icon: "lan" },
      { label: "Unit Types", href: "/settings/org-unit-types", icon: "label" },
      { label: "Positions", href: "/settings/positions", icon: "work" },
      { label: "Roles & Permissions", href: "/settings/roles", icon: "admin_panel_settings" },
      { label: "Features", href: "/settings/features", icon: "extension" },
    ],
  },
  { label: "Calendar", href: "/calendar", icon: "calendar_month" },
];

/** Simple Strata logo SVG */
function StrataLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
      aria-label="Strata"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M8 22h16M8 16h12M8 10h8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Sidebar — M3 Navigation Rail with hover drawer
 *
 * Desktop: 80px rail with logo at top, theme toggle at bottom
 * Items with children open a full-height navigation drawer on hover
 */
export function Sidebar() {
  const { hasPermission } = useUserPermissions();
  const { theme, setTheme } = useTheme();

  // Check if user has any nav permissions
  const hasAny = railItems.some((item) => true); // Rail items are always shown for simplicity
  if (!hasAny) return null;

  return (
    <NavigationRail
      items={railItems}
      topAction={
        <Tooltip content="Strata" side="right">
          <div className="flex items-center justify-center w-12 h-12">
            <StrataLogo />
          </div>
        </Tooltip>
      }
      bottomAction={
        <Tooltip content={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} side="right">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/8 active:bg-surface-foreground/12 transition-colors"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={24} className="text-surface-variant-foreground" />
          </button>
        </Tooltip>
      }
    />
  );
}
