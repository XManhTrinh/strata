"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import { Icon } from "@vkieu/mui";
import { Tooltip } from "@vkieu/mui";
import { useUserRole } from "@/hooks/use-user-role";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { NavigationRail } from "@vkieu/mui/navigation";

interface SidebarNavItem {
  value: string;
  label: string;
  href: string;
  icon: string;
  feature?: string;
}

/**
 * Admin-only pages — platform configuration & management.
 * Only visible to Super Admin users.
 */
const superAdminRailItems: SidebarNavItem[] = [
  { value: "org-structure", label: "Org Structure", href: "/admin/org-structure", icon: "lan" },
  { value: "unit-types", label: "Unit Types", href: "/admin/org-unit-types", icon: "label" },
  { value: "positions", label: "Positions", href: "/admin/positions", icon: "work" },
  { value: "roles", label: "Roles", href: "/admin/roles", icon: "admin_panel_settings" },
  { value: "features", label: "Features", href: "/admin/features", icon: "extension" },
  { value: "audit", label: "Audit", href: "/audit", icon: "history" },
];

/**
 * All possible items for manager/user roles.
 * Each item has a required `feature` — shown only if the user has
 * any permission in that feature (via backend roles & permissions).
 */
const permissionBasedItems: SidebarNavItem[] = [
  { value: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", feature: "dashboard" },
  { value: "people", label: "Members", href: "/people", icon: "group", feature: "people" },
  { value: "org-chart", label: "Org Chart", href: "/org-chart", icon: "account_tree", feature: "org_chart" },
  { value: "budgets", label: "Budgets", href: "/budgets", icon: "payments", feature: "budgets" },
  { value: "reports", label: "Reports", href: "/reports", icon: "summarize", feature: "reports" },
  { value: "calendar", label: "Calendar", href: "/calendar", icon: "calendar_month", feature: "calendar" },
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
 * Sidebar — M3 Navigation Rail (Composable API)
 *
 * - Super Admin: hardcoded Dashboard + Settings
 * - Manager/User: items filtered by backend permissions (hasFeatureAccess)
 */
export function Sidebar() {
  const pathname = usePathname();
  const { role } = useUserRole();
  const { isSuperAdmin, hasFeatureAccess } = useUserPermissions();
  const { theme, setTheme } = useTheme();

  // Super admin sees admin items, other roles see permission-filtered items
  let sidebarItems: SidebarNavItem[];

  if (isSuperAdmin) {
    sidebarItems = superAdminRailItems;
  } else {
    sidebarItems = permissionBasedItems.filter(
      (item) => item.feature === "dashboard" || hasFeatureAccess(item.feature!)
    );
    // Always include dashboard
    if (sidebarItems.length === 0) {
      sidebarItems = [permissionBasedItems[0]]; // Dashboard
    }
  }

  if (sidebarItems.length === 0) return null;

  // Derive active value from current pathname
  const activeValue =
    sidebarItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(item.href + "/")
    )?.value ?? sidebarItems[0]?.value;

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div className="hidden md:block">
      <NavigationRail expanded={false} className="fixed left-0 top-0 bottom-0">
        <NavigationRail.Header>
          <Tooltip content="Strata" side="right">
            <div className="flex items-center justify-center w-12 h-12">
              <StrataLogo />
            </div>
          </Tooltip>
        </NavigationRail.Header>
        <NavigationRail.Content>
          {sidebarItems.map((item) => (
            <Link key={item.value} href={item.href}>
              <NavigationRail.Item
                icon={item.icon}
                label={item.label}
                active={activeValue === item.value}
              />
            </Link>
          ))}
        </NavigationRail.Content>
        <NavigationRail.Footer>
          <Tooltip content={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} side="right">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/8 active:bg-surface-foreground/12 transition-colors"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={24} className="text-surface-variant-foreground" />
            </button>
          </Tooltip>
        </NavigationRail.Footer>
      </NavigationRail>
    </div>
  );
}
