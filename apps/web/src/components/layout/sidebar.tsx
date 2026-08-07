"use client";

import { useSidebar } from "@/hooks/use-sidebar";
import { Icon } from "@/components/ui/icon";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import {
  NavigationRail,
  type NavigationRailItem,
} from "@/components/ui/navigation-rail";
import {
  NavigationDrawer,
  type NavigationDrawerSection,
} from "@/components/ui/navigation-drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  feature: string;
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const allNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard", feature: "dashboard" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "People", href: "/people", icon: "person", feature: "people" },
      { label: "Employees", href: "/employees", icon: "group", feature: "employees" },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Org Chart", href: "/org-chart", icon: "account_tree", feature: "org_chart" },
      { label: "Org Structure", href: "/settings/org-structure", icon: "lan", feature: "authorization", permission: "manage_org_structure" },
      { label: "Unit Types", href: "/settings/org-unit-types", icon: "label", feature: "authorization", permission: "manage_org_structure" },
      { label: "Positions", href: "/settings/positions", icon: "work", feature: "authorization", permission: "manage_positions" },
    ],
  },
  {
    title: "Engineering",
    items: [
      { label: "Teams", href: "/engineering", icon: "engineering", feature: "engineering" },
      { label: "Capacity", href: "/capacity", icon: "trending_up", feature: "capacity" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Budgets", href: "/budgets", icon: "payments", feature: "budgets" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Roles & Permissions", href: "/settings/roles", icon: "admin_panel_settings", feature: "authorization", permission: "manage_roles" },
      { label: "Features", href: "/settings/features", icon: "extension", feature: "authorization", permission: "manage_features" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports", href: "/reports", icon: "summarize", feature: "reports" },
      { label: "Audit", href: "/audit", icon: "policy", feature: "audit" },
      { label: "Settings", href: "/settings", icon: "settings", feature: "authorization", permission: "manage_roles" },
    ],
  },
  {
    title: "Personal",
    items: [
      { label: "Calendar", href: "/calendar", icon: "calendar_month", feature: "calendar" },
    ],
  },
];

/**
 * Primary rail items — one per key section (max 7)
 * These are the most important items shown in the Navigation Rail on desktop.
 * Settings has sub-items that appear in a flyout drawer on hover.
 */
const railItems: NavigationRailItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "People", href: "/people", icon: "person" },
  { label: "Org Chart", href: "/org-chart", icon: "account_tree" },
  { label: "Engineering", href: "/engineering", icon: "engineering" },
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

/**
 * M3 Sidebar
 *
 * Desktop (≥768px): Navigation Rail — 80px fixed left rail, always visible.
 * Mobile (<768px): Modal Navigation Drawer via Sheet (triggered from header menu button).
 *
 * The rail shows the top 7 primary items (one per section).
 * The mobile drawer shows all items in full NavigationDrawer format with sections and labels.
 */
export function Sidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { hasPermission } = useUserPermissions();

  // Filter sections by user permissions for the mobile drawer
  const visibleSections: NavigationDrawerSection[] = allNavSections
    .map((section) => ({
      title: section.title,
      items: section.items
        .filter((item) => hasPermission(item.feature, item.permission))
        .map(({ label, href, icon }) => ({ label, href, icon })),
    }))
    .filter((section) => section.items.length > 0);

  if (visibleSections.length === 0) return null;

  return (
    <>
      {/* Desktop: Navigation Rail (≥768px) — always 80px */}
      <NavigationRail
        items={railItems}
        topAction={
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/8 transition-colors"
            aria-label="Open full navigation menu"
          >
            <Icon name="menu" size={24} />
          </button>
        }
      />

      {/* Mobile: Modal Navigation Drawer (<768px) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-70 p-0 flex flex-col bg-surface"
          aria-label="Mobile navigation"
        >
          <SheetHeader className="flex h-14 items-center px-7">
            <SheetTitle className="text-[22px] leading-7 font-normal">
              Strata
            </SheetTitle>
          </SheetHeader>

          <NavigationDrawer
            sections={visibleSections}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
