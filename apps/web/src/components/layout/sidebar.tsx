"use client";

import { useTheme } from "@/lib/theme";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/use-user-role";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import {
  NavigationRail,
  type NavigationRailItem,
} from "@/components/ui/navigation-rail";

/**
 * Super Admin sees only Dashboard + Settings (platform configuration).
 * They configure the business — they don't operate it.
 */
const superAdminRailItems: NavigationRailItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Org Structure", href: "/settings/org-structure", icon: "lan" },
  { label: "Unit Types", href: "/settings/org-unit-types", icon: "label" },
  { label: "Positions", href: "/settings/positions", icon: "work" },
  { label: "Roles", href: "/settings/roles", icon: "admin_panel_settings" },
  { label: "Features", href: "/settings/features", icon: "extension" },
];

/**
 * All possible items for manager/user roles.
 * Each item has a required `feature` — shown only if the user has
 * any permission in that feature (via backend roles & permissions).
 */
const permissionBasedItems: (NavigationRailItem & { feature: string })[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", feature: "dashboard" },
  {
    label: "People",
    href: "/people",
    icon: "person",
    feature: "people",
    children: [
      { label: "People", href: "/people", icon: "person" },
      { label: "Employees", href: "/employees", icon: "group" },
    ],
  },
  { label: "Org Chart", href: "/org-chart", icon: "account_tree", feature: "org_chart" },
  {
    label: "Engineering",
    href: "/engineering",
    icon: "engineering",
    feature: "capacity",
    children: [
      { label: "Teams", href: "/engineering", icon: "engineering" },
      { label: "Capacity", href: "/capacity", icon: "trending_up" },
    ],
  },
  { label: "Budgets", href: "/budgets", icon: "payments", feature: "budgets" },
  { label: "Reports", href: "/reports", icon: "summarize", feature: "reports" },
  { label: "Calendar", href: "/calendar", icon: "calendar_month", feature: "calendar" },
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
 * - Super Admin: hardcoded Dashboard + Settings
 * - Manager/User: items filtered by backend permissions (hasFeatureAccess)
 */
export function Sidebar() {
  const { role } = useUserRole();
  const { hasFeatureAccess } = useUserPermissions();
  const { theme, setTheme } = useTheme();

  // Determine rail items based on role
  let railItems: NavigationRailItem[];

  if (role === "super_admin") {
    // Super admin always sees Dashboard + Settings — hardcoded
    railItems = superAdminRailItems;
  } else {
    // Manager/user: filter by backend permissions
    // Always show Dashboard, filter the rest by feature access
    railItems = permissionBasedItems
      .filter((item) => item.feature === "dashboard" || hasFeatureAccess(item.feature))
      .map(({ feature: _feature, ...item }) => item);
  }

  if (railItems.length === 0) return null;

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
