"use client";

import { NavigationBar, NavigationBarItem, NavigationRail } from "@vkieu/mui";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { RouteAnnouncer } from "@/components/accessibility/route-announcer";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { Icon } from "@/components/ui/icon";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { cn } from "@/lib/utils";
import { CompactTopBar } from "@/components/navigation/compact-top-bar";
import { DisplaySettings } from "@/components/navigation/display-settings";
import { DrawerNav } from "@/components/navigation/drawer-nav";
import {
  ADMIN_BOTTOM_DESTINATIONS,
  BOTTOM_DESTINATIONS,
  isActive,
  pinned as isPinned,
  useVisibleCategories,
} from "@/components/navigation/nav-model";
import { NavRail } from "@/components/navigation/nav-rail";
import { Header } from "./header";
import { SkipToContent } from "./skip-to-content";

/**
 * The dashboard shell: the port of the docs-site navigation shell adapted to Strata's
 * fixed-viewport height model. A fixed left rail with Finance group flyout (md+), a compact
 * modal drawer opened from the compact top bar, a persistent bottom navigation bar, and the
 * content column holding Strata's Header folded in where the reference's TopAppBar sits.
 *
 * PRESERVES Strata's fixed-viewport model: the root is `h-dvh overflow-hidden` and `<main>`
 * owns the scroll (`flex-1 min-h-0 overflow-y-auto`), so interior pages that depend on a
 * bounded-height parent keep scrolling in-pane.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isSuperAdmin } = useUserPermissions();
  const visibleCategories = useVisibleCategories();
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const pinnedPanel = isPinned(pathname, visibleCategories);
  const bottomDestinations = isSuperAdmin ? ADMIN_BOTTOM_DESTINATIONS : BOTTOM_DESTINATIONS;

  return (
    <div className="h-dvh overflow-hidden bg-surface text-on-surface">
      <SkipToContent />
      <RouteAnnouncer />

      {/* Medium and wider: the fixed left rail with the Finance group flyout. */}
      <NavRail settings={<DisplaySettings />} />

      {/* Compact: a modal drawer opened from the compact top bar's navigation icon. */}
      <NavigationRail
        aria-label="Navigation"
        modal
        hideOnCollapse
        expanded={navOpen}
        onExpandedChange={setNavOpen}
      >
        <DrawerNav pathname={pathname} onNavigate={() => setNavOpen(false)} />
      </NavigationRail>

      {/* The rail is fixed; the content column insets past the rail (and the pinned panel),
          springing its inline-start margin as the pinned flyout pushes content. */}
      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col transition-[margin-inline-start] duration-[var(--md-sys-motion-spring-spatial-default-duration)] ease-[var(--md-sys-motion-spring-spatial-default-easing)] motion-reduce:transition-none",
          pinnedPanel ? "md:ms-[304px]" : "md:ms-24",
        )}
      >
        <Header
          className="sticky top-0 z-20 hidden md:flex"
          scrollBehavior="pinned"
          scrollRef={mainRef}
        />
        <CompactTopBar onOpenNav={() => setNavOpen(true)} scrollRef={mainRef} />
        <main
          id="main-content"
          ref={mainRef}
          className="min-w-0 flex-1 min-h-0 overflow-y-auto px-4 pb-28 md:px-6 md:pb-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      <NavigationBar aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        {bottomDestinations.map((dest) => (
          <NavigationBarItem
            key={dest.id}
            href={dest.href}
            icon={<Icon name={dest.icon} />}
            selected={isActive(pathname, dest.href)}
          >
            {dest.label}
          </NavigationBarItem>
        ))}
      </NavigationBar>

      <AssistantPanel />
    </div>
  );
}
