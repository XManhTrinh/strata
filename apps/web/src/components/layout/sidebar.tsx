"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useSidebar } from "@/hooks/use-sidebar";
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
  /** Required feature key — item only shows if user has any permission in this feature */
  feature: string;
  /** Optional: specific permission required (otherwise any permission in the feature suffices) */
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Full navigation definition. Items are filtered by permission at render time.
 * Super admin sees everything. Other roles only see items they have access to.
 */
const allNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "📊", feature: "dashboard" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "People", href: "/people", icon: "👤", feature: "people" },
      { label: "Employees", href: "/employees", icon: "👥", feature: "employees" },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Org Chart", href: "/org-chart", icon: "🏢", feature: "org_chart" },
      { label: "Org Structure", href: "/settings/org-structure", icon: "🗂️", feature: "authorization", permission: "manage_org_structure" },
      { label: "Unit Types", href: "/settings/org-unit-types", icon: "🏷️", feature: "authorization", permission: "manage_org_structure" },
      { label: "Positions", href: "/settings/positions", icon: "💼", feature: "authorization", permission: "manage_positions" },
    ],
  },
  {
    title: "Engineering",
    items: [
      { label: "Teams", href: "/engineering", icon: "⚙️", feature: "engineering" },
      { label: "Capacity", href: "/capacity", icon: "📈", feature: "capacity" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Budgets", href: "/budgets", icon: "💰", feature: "budgets" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Roles & Permissions", href: "/settings/roles", icon: "🔐", feature: "authorization", permission: "manage_roles" },
      { label: "Features", href: "/settings/features", icon: "🧩", feature: "authorization", permission: "manage_features" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports", href: "/reports", icon: "📋", feature: "reports" },
      { label: "Audit", href: "/audit", icon: "🔍", feature: "audit" },
      { label: "Settings", href: "/settings", icon: "⚙️", feature: "authorization", permission: "manage_roles" },
    ],
  },
  {
    title: "Personal",
    items: [
      { label: "Calendar", href: "/calendar", icon: "📅", feature: "calendar" },
    ],
  },
];

/**
 * Shared navigation content rendered both in the persistent desktop sidebar
 * and inside the mobile Sheet drawer.
 */
function SidebarNavContent({
  visibleSections,
  pathname,
  collapsed,
  reducedMotion,
  onNavigate,
}: {
  visibleSections: NavSection[];
  pathname: string;
  collapsed: boolean;
  reducedMotion: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2">
      {visibleSections.map((section) => (
        <div key={section.title} className="mb-4">
          {!collapsed && (
            <span className="block px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              {section.title}
            </span>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 min-h-11 text-sm transition-colors relative ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                    )}
                    <span className="text-base shrink-0 w-6 text-center" aria-hidden="true">
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const { hasPermission } = useUserPermissions();
  const pathname = usePathname();
  const reducedMotion = useReducedMotionContext();

  // Filter sections and items based on permissions
  const visibleSections = allNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        hasPermission(item.feature, item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

  // If user has no nav items at all, hide sidebar
  if (visibleSections.length === 0) return null;

  const width = collapsed ? 64 : 256;
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeInOut" as const };

  return (
    <>
      {/* Desktop: Persistent sidebar panel (≥768px) */}
      <motion.aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col border-r border-border bg-card overflow-hidden"
        animate={{ width }}
        transition={transition}
        aria-label="Main navigation"
      >
        {/* Logo / Toggle area */}
        <div className="flex h-16 items-center justify-between px-3 border-b border-border shrink-0">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
                className="text-lg font-bold text-foreground whitespace-nowrap"
              >
                Strata
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors min-w-11 min-h-11 flex items-center justify-center"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Desktop navigation */}
        <SidebarNavContent
          visibleSections={visibleSections}
          pathname={pathname}
          collapsed={collapsed}
          reducedMotion={reducedMotion}
        />
      </motion.aside>

      {/* Mobile: Sheet sidebar (<768px) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-70 p-0 flex flex-col"
          aria-label="Mobile navigation"
        >
          <SheetHeader className="px-4 py-4 border-b border-border">
            <SheetTitle className="text-lg font-bold">Strata</SheetTitle>
          </SheetHeader>

          {/* Mobile navigation — always expanded, close sheet on navigate */}
          <SidebarNavContent
            visibleSections={visibleSections}
            pathname={pathname}
            collapsed={false}
            reducedMotion={reducedMotion}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
