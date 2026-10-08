"use client";

import { useMemo } from "react";
import { useUserPermissions } from "@/hooks/use-user-permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavChild {
  label: string;
  href: string;
  /** Feature gate — child shown only if the role has access. */
  feature?: string;
}

export interface NavCategory {
  /** Stable key + predicate target (renamed from `value` in the old sidebar). */
  id: string;
  label: string;
  /** Material Symbols glyph name passed to <Icon name>. */
  icon: string;
  /** Where the rail item / group trigger navigates (section hub for groups). */
  href: string;
  /** Feature gate for a leaf category. */
  feature?: string;
  /** Present only on grouped categories (Finance). */
  children?: NavChild[];
}

export interface BottomDestination {
  id: string;
  label: string;
  href: string;
  /** Material Symbols glyph name. */
  icon: string;
}

// ─── Category data ──────────────────────────────────────────────────────────

/**
 * Admin-only categories — platform configuration & management.
 * Only visible to Super Admin users. Flat (no children).
 */
export const superAdminCategories: NavCategory[] = [
  { id: "hierarchy", label: "Hierarchy", href: "/admin/org-structure", icon: "lan" },
  { id: "unit-types", label: "Unit Types", href: "/admin/org-unit-types", icon: "label" },
  { id: "positions", label: "Positions", href: "/admin/positions", icon: "work" },
  { id: "roles", label: "Roles", href: "/admin/roles", icon: "admin_panel_settings" },
  { id: "features", label: "Features", href: "/admin/features", icon: "extension" },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: "settings" },
];

/**
 * Categories for manager/user roles. A category is shown when the role has
 * access to it (via `feature`) or to at least one of its children.
 */
export const permissionCategories: NavCategory[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", feature: "dashboard" },
  { id: "people", label: "Members", href: "/people", icon: "group", feature: "people" },
  { id: "org-chart", label: "Org Chart", href: "/org-chart", icon: "account_tree", feature: "org_chart" },
  {
    id: "finance",
    label: "Finance",
    href: "/finance",
    icon: "account_balance",
    children: [
      { label: "Budgets", href: "/finance/budgets", feature: "budgeting" },
      { label: "Capacity", href: "/finance/capacity", feature: "capacity" },
      { label: "Rate Cards", href: "/finance/rate-cards", feature: "capacity" },
    ],
  },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: "calendar_month", feature: "calendar" },
];

// ─── Compact bottom-bar destinations ──────────────────────────────────────────

/** Non-admin compact bottom bar — four primary destinations. */
export const BOTTOM_DESTINATIONS: BottomDestination[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { id: "people", label: "Members", href: "/people", icon: "group" },
  { id: "finance", label: "Finance", href: "/finance", icon: "account_balance" },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: "calendar_month" },
];

/**
 * Super-admin compact bottom bar — a curated four. Unit Types + Features are
 * drawer-only (the modal drawer still lists all six admin categories).
 */
export const ADMIN_BOTTOM_DESTINATIONS: BottomDestination[] = [
  { id: "hierarchy", label: "Hierarchy", href: "/admin/org-structure", icon: "lan" },
  { id: "positions", label: "Positions", href: "/admin/positions", icon: "work" },
  { id: "roles", label: "Roles", href: "/admin/roles", icon: "admin_panel_settings" },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: "settings" },
];

// ─── Predicates ─────────────────────────────────────────────────────────────

/** Prefix match: current page is this href or a descendant of it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The group id whose route owns `pathname` (hub-inclusive). Drives the rail
 * trigger's `data-current` and the flyout's default displayed group — true on
 * both the Finance hub (`/finance`) and its detail routes (`/finance/*`).
 */
export function current(pathname: string): string | null {
  return isActive(pathname, "/finance") ? "finance" : null;
}

/**
 * Whether the Finance flyout is a permanent pane (and the content column insets
 * to 304px). Detail-only (`/finance/<child>`, hub excluded) and guarded by
 * Finance being in the visible set so a user without Finance access never
 * insets to an empty pane. The single source consumed by both NavRail and
 * DashboardShell so the flyout and the inset always agree.
 */
export function pinned(pathname: string, visibleCategories: NavCategory[]): boolean {
  return (
    /^\/finance\/[^/]+/.test(pathname) &&
    visibleCategories.some((c) => c.id === "finance")
  );
}

// ─── Visible categories ────────────────────────────────────────────────────

/**
 * Resolves the ordered categories visible to the current role, with grouped
 * categories (Finance) already feature-filtered. Super admins get all six admin
 * categories unfiltered; everyone else gets the permission-gated set with a
 * Dashboard fallback so the rail is never empty.
 */
export function useVisibleCategories(): NavCategory[] {
  const { isSuperAdmin, hasFeatureAccess } = useUserPermissions();

  return useMemo<NavCategory[]>(() => {
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
    // Always keep dashboard as a fallback so the rail is never empty.
    if (visible.length === 0) visible.push(permissionCategories[0]);
    return visible;
  }, [isSuperAdmin, hasFeatureAccess]);
}
