"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme, TooltipTrigger, Tooltip } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { cn } from "@/lib/utils";

// ─── Nav model ──────────────────────────────────────────────────────────────

interface NavChild {
  label: string;
  href: string;
  /** Feature gate — child shown only if the role has access. */
  feature?: string;
}

interface NavCategory {
  value: string;
  label: string;
  icon: string;
  /** Where the rail item navigates. For parents, usually the section hub. */
  href: string;
  /** Feature gate for the category itself (leaf categories). */
  feature?: string;
  /** Sub-items shown in the secondary rail when this category is active. */
  children?: NavChild[];
}

/**
 * Admin-only categories — platform configuration & management.
 * Only visible to Super Admin users. Flat (no children).
 */
const superAdminCategories: NavCategory[] = [
  { value: "hierarchy", label: "Hierarchy", href: "/admin/org-structure", icon: "lan" },
  { value: "unit-types", label: "Unit Types", href: "/admin/org-unit-types", icon: "label" },
  { value: "positions", label: "Positions", href: "/admin/positions", icon: "work" },
  { value: "roles", label: "Roles", href: "/admin/roles", icon: "admin_panel_settings" },
  { value: "features", label: "Features", href: "/admin/features", icon: "extension" },
  { value: "settings", label: "Settings", href: "/admin/settings", icon: "settings" },
];

/**
 * Categories for manager/user roles. A category is shown when the role has
 * access to it (via `feature`) or to at least one of its children.
 */
const permissionCategories: NavCategory[] = [
  { value: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", feature: "dashboard" },
  { value: "people", label: "Members", href: "/people", icon: "group", feature: "people" },
  { value: "org-chart", label: "Org Chart", href: "/org-chart", icon: "account_tree", feature: "org_chart" },
  {
    value: "finance",
    label: "Finance",
    href: "/finance",
    icon: "account_balance",
    children: [
      { label: "Budgets", href: "/finance/budgets", feature: "budgeting" },
      { label: "Capacity", href: "/finance/capacity", feature: "capacity" },
      { label: "Rate Cards", href: "/finance/rate-cards", feature: "capacity" },
    ],
  },
  { value: "calendar", label: "Calendar", href: "/calendar", icon: "calendar_month", feature: "calendar" },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

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
      <path d="M8 22h16M8 16h12M8 10h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

/**
 * Two-pane M3 navigation: a compact icon rail plus a secondary drawer that
 * lists a category's child links. The drawer opens on hover and stays pinned
 * while the current route belongs to a category that has children.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { isSuperAdmin, hasFeatureAccess } = useUserPermissions();
  const { mode, setMode } = useTheme();

  // Resolve the visible categories + (for parents) their accessible children.
  const categories = useMemo<NavCategory[]>(() => {
    if (isSuperAdmin) return superAdminCategories;

    const visible: NavCategory[] = [];
    for (const cat of permissionCategories) {
      if (cat.children && cat.children.length > 0) {
        const children = cat.children.filter(
          (c) => !c.feature || hasFeatureAccess(c.feature),
        );
        // Parent shows only if at least one child is accessible.
        if (children.length > 0) visible.push({ ...cat, children });
      } else {
        const accessible =
          cat.feature === "dashboard" || !cat.feature || hasFeatureAccess(cat.feature);
        if (accessible) visible.push(cat);
      }
    }
    // Always keep dashboard as a fallback.
    if (visible.length === 0) visible.push(permissionCategories[0]);
    return visible;
  }, [isSuperAdmin, hasFeatureAccess]);

  // Which category owns the current route (for rail item highlighting).
  const activeCategory = useMemo(() => {
    return categories.find((cat) => {
      if (pathname === cat.href || pathname.startsWith(cat.href + "/")) return true;
      return cat.children?.some(
        (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
      );
    });
  }, [categories, pathname]);

  // Hover-only drawer: opens while hovering a category with children, closes on
  // leave. Never pinned — it overlays content and doesn't shift the layout.
  const [openValue, setOpenValue] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openCategory = (value: string) => {
    cancelClose();
    setOpenValue(value);
  };
  const scheduleClose = () => {
    cancelClose();
    // Grace delay so you can move diagonally from the rail into the drawer
    // (past other rail items) without it snapping shut.
    closeTimer.current = setTimeout(() => setOpenValue(null), 400);
  };

  const drawerCat = categories.find((c) => c.value === openValue && c.children?.length);
  const isDrawerVisible = !!drawerCat;

  const toggleTheme = () => setMode(mode === "dark" ? "light" : "dark");

  if (categories.length === 0) return null;

  return (
    <div className="hidden md:flex fixed left-0 top-0 bottom-0 z-40">
      {/* ── Rail ─────────────────────────────────────────────────── */}
      <nav
        className="flex flex-col items-center w-24 shrink-0 bg-surface-container h-full py-3"
        aria-label="Main navigation"
        onMouseLeave={scheduleClose}
      >
        {/* Logo */}
        <TooltipTrigger placement="right">
          <div
            className="flex items-center justify-center w-12 h-12 mb-6"
            onMouseEnter={scheduleClose}
          >
            <StrataLogo />
          </div>
          <Tooltip>Strata</Tooltip>
        </TooltipTrigger>

        {/* Category items */}
        <div className="flex flex-col items-center gap-1 flex-1 overflow-y-auto w-full">
          {categories.map((cat) => {
            const isActive = activeCategory?.value === cat.value;
            const isHovered = openValue === cat.value;
            const highlighted = isActive || isHovered;

            return (
              <div
                key={cat.value}
                className="w-full flex justify-center"
                onMouseEnter={() =>
                  cat.children?.length ? openCategory(cat.value) : scheduleClose()
                }
              >
                <Link href={cat.href} className="no-underline">
                  <button
                    type="button"
                    className="group relative flex flex-col items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg py-1"
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="relative flex items-center justify-center w-14 h-8">
                      {/* Active/hover indicator pill */}
                      <span
                        className={cn(
                          "absolute inset-0 rounded-full origin-center transition-[transform,opacity] duration-200",
                          highlighted ? "bg-secondary-container scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                        )}
                      />
                      {/* State layer */}
                      <span
                        className={cn(
                          "absolute inset-0 rounded-full transition-colors duration-200",
                          isActive
                            ? "group-hover:bg-secondary-container-foreground/8"
                            : "group-hover:bg-surface-variant-foreground/8",
                        )}
                      />
                      <Icon
                        name={cat.icon}
                        size={24}
                        filled={isActive}
                        className={cn(
                          "relative z-10 transition-colors duration-200",
                          highlighted ? "text-secondary-container-foreground" : "text-surface-variant-foreground",
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        "text-[12px] leading-4 font-medium tracking-[0.5px] mt-0.5",
                        highlighted ? "text-secondary" : "text-surface-variant-foreground",
                      )}
                    >
                      {cat.label}
                    </span>
                  </button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Theme toggle */}
        <div className="flex flex-col items-center pt-2" onMouseEnter={scheduleClose}>
          <TooltipTrigger placement="right">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/8 active:bg-surface-foreground/12 transition-colors"
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
            >
              <Icon
                name={mode === "dark" ? "light_mode" : "dark_mode"}
                size={24}
                className="text-on-surface-variant"
              />
            </button>
            <Tooltip>{`Switch to ${mode === "dark" ? "light" : "dark"} mode`}</Tooltip>
          </TooltipTrigger>
        </div>
      </nav>

      {/* ── Secondary drawer ─────────────────────────────────────── */}
      <div
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        className={cn(
          // M3: the rail sits on surface-container; the expanded pane reads as
          // elevated above it, so it uses the higher container tone. Both tones
          // and the outline-variant divider are defined per theme (light/dark).
          "h-full bg-surface-container-high overflow-hidden rounded-e-2xl",
          "shadow-[2px_0_8px_0_hsl(var(--elevation-1))]",
          "transition-[width,opacity]",
          isDrawerVisible
            ? "w-56 opacity-100 border-l border-outline-variant duration-300 ease-[cubic-bezier(0.05,0.7,0.1,1)]"
            : "w-0 opacity-0 duration-200 ease-[cubic-bezier(0.3,0,0.8,0.15)]",
        )}
      >
        {drawerCat && (
          <div key={drawerCat.value} className="w-56 h-full flex flex-col">
            <div className="px-4 pt-4 pb-2">
              <span className="text-[11px] font-medium tracking-[0.5px] uppercase text-surface-variant-foreground">
                {drawerCat.label}
              </span>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-0.5">
              {drawerCat.children!.map((child) => {
                const isChildActive =
                  pathname === child.href || pathname.startsWith(child.href + "/");
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "no-underline flex items-center px-3 py-2.5 rounded-full text-[14px] leading-5 transition-colors",
                      isChildActive
                        ? "bg-secondary-container text-secondary-container-foreground font-medium"
                        : "text-surface-variant-foreground hover:bg-surface-foreground/8",
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
