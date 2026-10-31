"use client";

import { type ReactNode, useId } from "react";
import Link from "next/link";
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
import { RailPanel, type RailPanelGroup, useRailPanel } from "@/components/ui/rail-panel";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { type Destination, destinationsFor, isCurrent, subPagesFor } from "./destinations";

type PanelKey = "settings" | "planning";

/** Up to two letters from the workspace's name, for its tile. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? "").slice(0, 2)
  ).toUpperCase();
}

/**
 * Material 3 adaptive navigation: a navigation bar on phones (< 600px) and a collapsed rail
 * (icons with labels) from 600px. Destinations with pages under them (Settings, Planning) open
 * a panel of those pages beside the rail: pinned while one of them is open, and previewed on
 * hover or focus from anywhere else. Pages render their own PageHeader.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const t = useTranslations("shell");
  const ts = useTranslations("settings");
  const tp = useTranslations("planning");
  const pathname = usePathname();
  const context = useWorkspace();
  const destinations = destinationsFor(context);
  const panelId = useId();

  const groups = new Map<PanelKey, RailPanelGroup & { destination: Destination }>();
  for (const destination of destinations) {
    if (destination.key !== "settings" && destination.key !== "planning") continue;
    const tr = destination.key === "settings" ? ts : tp;
    const links = subPagesFor(destination, context).map((page) => ({
      href: page.href,
      label: tr(page.label as Parameters<typeof tr>[0]),
    }));
    if (links.length === 0) continue;
    const name = t(`nav.${destination.key}`);
    groups.set(destination.key, { destination, heading: name, label: name, links });
  }
  const current =
    [...groups.keys()].find((key) => isCurrent(groups.get(key)!.destination, pathname)) ?? null;
  const panel = useRailPanel<PanelKey>(current, pathname);
  const openGroup = panel.open ? (groups.get(panel.open) ?? null) : null;

  return (
    <div className="bg-surface text-on-surface flex min-h-dvh">
      <SkipLink target="main-content">{t("skipToContent")}</SkipLink>

      <div
        className="medium:flex sticky top-0 z-30 hidden h-dvh shrink-0"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) panel.close();
        }}
      >
        <NavigationRail
          aria-label={t("navigation")}
          expanded={false}
          className="bg-surface-container relative z-40 h-full"
          // Home is the workspace's tile at the top, set apart from the destinations (as on
          // Windmorph's site); phones keep Home in the bottom bar.
          header={
            <Link
              href={`/w/${context.workspace.slug}`}
              aria-current={pathname === `/w/${context.workspace.slug}` ? "page" : undefined}
              className="rounded-corner-large bg-primary text-on-primary text-title-medium focus-visible:outline-secondary mx-auto -mt-8 mb-4 grid size-14 place-items-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {/* Named by hidden text, not a label, so the initials shown don't contradict it. */}
              <span className="sr-only">{t("nav.home")}</span>
              <span aria-hidden>{initials(context.workspace.name)}</span>
            </Link>
          }
        >
          {destinations
            .filter((destination) => destination.key !== "home")
            .map((destination) => {
              const group = groups.get(destination.key as PanelKey);
              const key = destination.key as PanelKey;
              return (
                <NavigationRailItem
                  key={destination.key}
                  // A destination with pages opens its first one.
                  href={group?.links[0]?.href ?? destination.href}
                  selected={isCurrent(destination, pathname)}
                  icon={<Icon name={destination.icon} />}
                  selectedIcon={<Icon name={destination.icon} filled />}
                  {...(group && {
                    "aria-expanded": panel.open === key,
                    "aria-controls": panel.open === key ? panelId : undefined,
                    ...panel.trigger(key),
                  })}
                >
                  {t(`nav.${destination.key}`)}
                </NavigationRailItem>
              );
            })}
        </NavigationRail>
        <RailPanel
          id={panelId}
          groupKey={panel.open}
          group={openGroup}
          open={openGroup !== null}
          pinned={panel.pinned}
          pathname={pathname}
          {...panel.panel}
        />
      </div>

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
