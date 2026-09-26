"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { NavigationBar } from "@vkieu/mui/navigation";

/**
 * Mobile bottom navigation using M3 Navigation Bar.
 *
 * Shows 5 items max: Dashboard, People, Finance, Calendar, More.
 * The "More" item opens the full navigation drawer (Sheet) via useSidebar.
 */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setMobileOpen } = useSidebar();

  // Map values to routes
  const routes: Record<string, string> = {
    dashboard: "/dashboard",
    people: "/people",
    finance: "/finance",
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
      <NavigationBar value={activeValue} onValueChange={handleValueChange}>
        <NavigationBar.Item value="dashboard" icon="dashboard" label="Dashboard" />
        <NavigationBar.Item value="people" icon="person" label="People" />
        <NavigationBar.Item value="finance" icon="account_balance" label="Finance" />
        <NavigationBar.Item value="calendar" icon="calendar_month" label="Calendar" />
        <NavigationBar.Item value="more" icon="more_horiz" label="More" />
      </NavigationBar>
    </div>
  );
}
