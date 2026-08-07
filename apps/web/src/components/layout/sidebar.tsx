"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useSidebar } from "@/hooks/use-sidebar";
import { Icon } from "@/components/ui/icon";
import { Tooltip } from "@/components/ui/tooltip";
import { Divider } from "@/components/ui/divider";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
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
 * M3 Navigation Drawer Item
 *
 * Specs (m3.material.io/components/navigation-drawer):
 * - Height: 56px
 * - Shape: rounded-full (28px radius)
 * - Active: secondary-container bg, on-secondary-container text, icon filled
 * - Inactive: transparent, on-surface-variant text, icon outlined
 * - Padding: 16px start (icon), 12px gap, 24px end
 * - Icon: 24px
 * - Label: Label Large (14px/20px)
 */
function NavDrawerItem({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const content = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`
        flex items-center gap-3 rounded-full h-14 transition-colors duration-200
        ${collapsed ? "justify-center w-14 px-0 mx-auto" : "px-4 mx-3"}
        ${isActive
          ? "bg-secondary-container text-secondary-container-foreground font-medium"
          : "text-surface-variant-foreground hover:bg-surface-foreground/8"
        }
      `}
    >
      <Icon
        name={item.icon}
        size={24}
        filled={isActive}
        className="shrink-0"
      />
      {!collapsed && (
        <span className="text-[14px] leading-5 whitespace-nowrap truncate">
          {item.label}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}

/**
 * M3 Navigation Drawer Content
 * Renders nav sections with items and dividers between groups.
 */
function NavigationDrawerContent({
  visibleSections,
  pathname,
  collapsed,
  onNavigate,
}: {
  visibleSections: NavSection[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {visibleSections.map((section, sectionIndex) => (
        <div key={section.title}>
          {/* Section divider (between groups, not before first) */}
          {sectionIndex > 0 && (
            <div className="py-2 px-4">
              <Divider />
            </div>
          )}

          {/* Section label */}
          {!collapsed && (
            <p className="px-7 pt-4 pb-1 text-[11px] leading-4 font-medium tracking-wider uppercase text-surface-variant-foreground">
              {section.title}
            </p>
          )}

          {/* Nav items */}
          <ul className="space-y-0.5 mt-1">
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <NavDrawerItem
                    item={item}
                    isActive={isActive}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * M3 Navigation Drawer (Sidebar)
 *
 * Desktop: Standard navigation drawer (360px expanded, 80px rail)
 * Mobile: Modal navigation drawer via Sheet (slides from left)
 *
 * Specs: m3.material.io/components/navigation-drawer
 * - Background: surface-container (slightly elevated surface)
 * - No visible border (uses elevation/tint instead)
 * - Header: 64px with branding
 * - Rail mode: 80px width, icons only with tooltips
 */
export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const { hasPermission } = useUserPermissions();
  const pathname = usePathname();
  const reducedMotion = useReducedMotionContext();

  const visibleSections = allNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        hasPermission(item.feature, item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

  if (visibleSections.length === 0) return null;

  const width = collapsed ? 80 : 280;
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: [0.2, 0, 0, 1] as [number, number, number, number] };

  return (
    <>
      {/* Desktop: Navigation Drawer (≥768px) */}
      <motion.aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col bg-[hsl(var(--surface-variant)/0.3)] overflow-hidden"
        animate={{ width }}
        transition={transition}
        aria-label="Main navigation"
      >
        {/* Header — branding + menu toggle */}
        <div className="flex h-16 items-center px-4 shrink-0">
          <Tooltip content={collapsed ? "Expand menu" : "Collapse menu"} side="right">
            <button
              onClick={toggle}
              className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/8 transition-colors"
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            >
              <Icon name="menu" size={24} />
            </button>
          </Tooltip>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                className="ml-4 text-[22px] leading-7 font-normal text-surface-foreground whitespace-nowrap"
              >
                Strata
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation items */}
        <NavigationDrawerContent
          visibleSections={visibleSections}
          pathname={pathname}
          collapsed={collapsed}
        />
      </motion.aside>

      {/* Mobile: Modal Navigation Drawer (<768px) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 flex flex-col bg-[hsl(var(--surface))]"
          aria-label="Mobile navigation"
        >
          <SheetHeader className="flex h-16 items-center px-4">
            <SheetTitle className="text-[22px] leading-7 font-normal">
              Strata
            </SheetTitle>
          </SheetHeader>

          <NavigationDrawerContent
            visibleSections={visibleSections}
            pathname={pathname}
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
