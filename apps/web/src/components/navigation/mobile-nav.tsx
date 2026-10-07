"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { NavigationBar, NavigationBarItem } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";

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
      <NavigationBar aria-label="Main navigation">
        <NavigationBarItem
          icon={<Icon name="dashboard" />}
          selected={activeValue === "dashboard"}
          onPress={() => handleValueChange("dashboard")}
        >
          Dashboard
        </NavigationBarItem>
        <NavigationBarItem
          icon={<Icon name="person" />}
          selected={activeValue === "people"}
          onPress={() => handleValueChange("people")}
        >
          People
        </NavigationBarItem>
        <NavigationBarItem
          icon={<Icon name="account_balance" />}
          selected={activeValue === "finance"}
          onPress={() => handleValueChange("finance")}
        >
          Finance
        </NavigationBarItem>
        <NavigationBarItem
          icon={<Icon name="calendar_month" />}
          selected={activeValue === "calendar"}
          onPress={() => handleValueChange("calendar")}
        >
          Calendar
        </NavigationBarItem>
        <NavigationBarItem
          icon={<Icon name="more_horiz" />}
          selected={activeValue === "more"}
          onPress={() => handleValueChange("more")}
        >
          More
        </NavigationBarItem>
      </NavigationBar>
    </div>
  );
}
