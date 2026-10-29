"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  NavigationBar,
  NavigationBarItem,
  NavigationRail,
  NavigationRailItem,
} from "@windmorph/react";
import { SkipLink } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { destinationsFor, isCurrent } from "./destinations";

/**
 * Material 3 adaptive navigation: a navigation bar on phones (< 600px), a rail on tablets and
 * an expanded rail on large screens (≥ 1200px). Pages render their own PageHeader.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const context = useWorkspace();
  const destinations = destinationsFor(context);
  const large = useMediaQuery("(min-width: 1200px)");

  return (
    <div className="bg-surface text-on-surface flex min-h-dvh">
      <SkipLink target="main-content">{t("skipToContent")}</SkipLink>

      <NavigationRail
        aria-label={t("navigation")}
        expanded={large}
        className="medium:flex sticky top-0 hidden h-dvh shrink-0"
      >
        {destinations.map((destination) => {
          const current = isCurrent(destination, pathname);
          return (
            <NavigationRailItem
              key={destination.key}
              href={destination.href}
              selected={current}
              icon={<Icon name={destination.icon} />}
              selectedIcon={<Icon name={destination.icon} filled />}
            >
              {t(`nav.${destination.key}`)}
            </NavigationRailItem>
          );
        })}
      </NavigationRail>

      <main
        id="main-content"
        tabIndex={-1}
        className="medium:pb-0 min-w-0 flex-1 pb-24 outline-none"
      >
        {children}
      </main>

      <NavigationBar
        aria-label={t("navigation")}
        className="medium:hidden fixed inset-x-0 bottom-0 z-20"
      >
        {destinations.map((destination) => {
          const current = isCurrent(destination, pathname);
          return (
            <NavigationBarItem
              key={destination.key}
              href={destination.href}
              selected={current}
              icon={<Icon name={destination.icon} />}
              selectedIcon={<Icon name={destination.icon} filled />}
            >
              {t(`nav.${destination.key}`)}
            </NavigationBarItem>
          );
        })}
      </NavigationBar>
    </div>
  );
}
