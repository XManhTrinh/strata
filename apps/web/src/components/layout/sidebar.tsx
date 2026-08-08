"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { Icon } from "@strata/mui";
import { Tooltip } from "@strata/mui";
import { useUserRole } from "@/hooks/use-user-role";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import {
  NavigationRail,
  type NavigationRailItem,
} from "@strata/mui/navigation";

interface SidebarNavItem extends NavigationRailItem {
  href: string;
  feature?: string;
}

/**
 * Super Admin sees only Dashboard + Settings (platform configuration).
 * They configure the business — they don't operate it.
 */
const superAdminRailItems: SidebarNavItem[] = [
  { value: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { value: "org-structure", label: "Org Structure", href: "/settings/org-structure", icon: "lan" },
  { value: "unit-types", label: "Unit Types", href: "/settings/org-unit-types", icon: "label" },
  { value: "positions", label: "Positions", href: "/settings/positions", icon: "work" },
  { value: "roles", label: "Roles", href: "/settings/roles", icon: "admin_panel_settings" },
  { value: "features", label: "Features", href: "/settings/features", icon: "extension" },
];

/**
 * All possible items for manager/user roles.
 * Each item has a required `feature` — shown only if the user has
 * any permission in that feature (via backend roles & permissions).
 */
const permissionBasedItems: SidebarNavItem[] = [
  { value: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", feature: "dashboard" },
  { value: "people", label: "People", href: "/people", icon: "person", feature: "people" },
  { value: "org-chart", label: "Org Chart", href: "/org-chart", icon: "account_tree", feature: "org_chart" },
  { value: "engineering", label: "Engineering", href: "/engineering", icon: "engineering", feature: "capacity" },
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
 * Sidebar — M3 Navigation Rail
 *
 * - Super Admin: hardcoded Dashboard + Settings
 * - Manager/User: items filtered by backend permissions (hasFeatureAccess)
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useUserRole();
  const { hasFeatureAccess } = useUserPermissions();
  const { theme, setTheme } = useTheme();

  // Determine rail items based on role
  let sidebarItems: SidebarNavItem[];

  if (role === "super_admin") {
    sidebarItems = superAdminRailItems;
  } else {
    sidebarItems = permissionBasedItems.filter(
      (item) => item.feature === "dashboard" || hasFeatureAccess(item.feature!)
    );
  }

  if (sidebarItems.length === 0) return null;

  // Derive active value from current pathname
  const activeValue =
    sidebarItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(item.href + "/")
    )?.value ?? sidebarItems[0]?.value;

  // Navigate on value change
  const handleValueChange = (value: string) => {
    const target = sidebarItems.find((item) => item.value === value);
    if (target) router.push(target.href);
  };

  // Strip href/feature from items to match NavigationRailItem type
  const railItems: NavigationRailItem[] = sidebarItems.map(
    ({ href: _href, feature: _feature, ...item }) => item
  );

  return (
    <div className="hidden md:block">
      <NavigationRail
        items={railItems}
        activeValue={activeValue}
        onValueChange={handleValueChange}
        header={
          <Tooltip content="Strata" side="right">
            <div className="flex items-center justify-center w-12 h-12">
              <StrataLogo />
            </div>
          </Tooltip>
        }
      />
      {/* Theme toggle — positioned at bottom of rail */}
      <div className="fixed left-0 bottom-0 z-40 w-24 hidden md:flex items-center justify-center pb-4">
        <Tooltip content={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} side="right">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/[0.08] active:bg-surface-foreground/[0.12] transition-colors"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={24} className="text-surface-variant-foreground" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
