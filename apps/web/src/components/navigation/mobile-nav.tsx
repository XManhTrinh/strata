"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import {
  NavigationBar,
  type NavigationBarItem,
} from "@strata/mui/navigation";

/**
 * Mobile bottom navigation using M3 Navigation Bar.
 *
 * Shows 5 items max: Dashboard, People, Engineering, Calendar, More.
 * The "More" item opens the full navigation drawer (Sheet) via useSidebar.
 */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setMobileOpen } = useSidebar();

  const items: NavigationBarItem[] = [
    { value: "dashboard", label: "Dashboard", icon: "dashboard" },
    { value: "people", label: "People", icon: "person" },
    { value: "engineering", label: "Engineering", icon: "engineering" },
    { value: "calendar", label: "Calendar", icon: "calendar_month" },
    { value: "more", label: "More", icon: "more_horiz" },
  ];

  // Map values to routes
  const routes: Record<string, string> = {
    dashboard: "/dashboard",
    people: "/people",
    engineering: "/engineering",
    calendar: "/calendar",
  };

  // Derive active value from pathname
  const activeValue =
    Object.entries(routes).find(
      ([, href]) => pathname === href || pathname.startsWith(href + "/")
    )?.[0] ?? "dashboard";

  const handleValueChange = (value: string) => {
    if (value === "more") {
      setMobileOpen(true);
      return;
    }
    const href = routes[value];
    if (href) router.push(href);
  };

  return (
    <div className="md:hidden">
      <NavigationBar
        items={items}
        activeValue={activeValue}
        onValueChange={handleValueChange}
      />
    </div>
  );
}
