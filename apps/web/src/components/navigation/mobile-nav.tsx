"use client";

import { useSidebar } from "@/hooks/use-sidebar";
import {
  NavigationBar,
  type NavigationBarItem,
} from "@/components/ui/navigation-bar";

/**
 * Mobile bottom navigation using M3 Navigation Bar.
 *
 * Shows 5 items max: Dashboard, People, Engineering, Calendar, More.
 * The "More" item opens the full navigation drawer (Sheet) via useSidebar.
 */
export function MobileNav() {
  const { setMobileOpen } = useSidebar();

  const items: NavigationBarItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { label: "People", href: "/people", icon: "person" },
    { label: "Engineering", href: "/engineering", icon: "engineering" },
    { label: "Calendar", href: "/calendar", icon: "calendar_month" },
    { label: "More", icon: "more_horiz", onClick: () => setMobileOpen(true) },
  ];

  return <NavigationBar items={items} />;
}
