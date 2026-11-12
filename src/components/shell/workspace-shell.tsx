"use client";

import { useId, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  NavigationBar,
  NavigationBarItem,
  NavigationRail,
  NavigationRailItem,
  SideSheet,
} from "@windmorph/react";
// Note: Windmorph's useNavigationRail manages a single expand/collapse rail; Strata's rail stays
// collapsed and drives a separate secondary panel (useRailPanel) with hover/focus preview and a
// pinned current-page group, which that hook doesn't model. The custom hook is kept deliberately.
import { SkipLink } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { type Destination, destinationsFor, isCurrent, subPagesFor } from "./destinations";
import { useRailPanel, pickCurrentLink, type RailPanelGroup } from "./use-rail-panel";

/** Settings, Planning, or a page group of its own such as Account. */
type PanelKey = string;

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
 * hover or focus from anywhere else. Pages outside the rail's destinations (Account) bring their
 * own pinned panel. Pages render their own PageHeader.
 */
export function WorkspaceShell({
  children,
  panel: ownPanel,
}: {
  children: ReactNode;
  /** Pages of a group that isn't a destination, pinned beside the rail while one is open. */
  panel?: RailPanelGroup & { key: string };
}) {
  const t = useTranslations("shell");
  const ts = useTranslations("settings");
  const tp = useTranslations("planning");
  const pathname = usePathname();
  const context = useWorkspace();
  const destinations = destinationsFor(context);
  const panelId = useId();

  const groups = new Map<PanelKey, RailPanelGroup & { destination?: Destination }>();
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
  if (ownPanel) groups.set(ownPanel.key, ownPanel);
  const current =
    ownPanel?.key ??
    [...groups.keys()].find((key) => {
      const destination = groups.get(key)!.destination;
      return destination ? isCurrent(destination, pathname) : false;
    }) ??
    null;
  const panel = useRailPanel<PanelKey>(current, pathname);
  const openGroup = panel.open ? (groups.get(panel.open) ?? null) : null;

  const isPanelOpen = openGroup !== null;
  const isPinned = panel.pinned;

  return (
    <div className="bg-surface text-on-surface flex min-h-dvh">
      <SkipLink target="main-content">{t("skipToContent")}</SkipLink>

      {/* Above the page's sticky layer (its header), so the rail's panel opens over it. */}
      <div
        className="medium:flex sticky top-0 z-[calc(var(--md-sys-z-sticky)+1)] hidden h-dvh shrink-0"
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
              {context.workspace.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link
                <img
                  src={context.workspace.logoUrl}
                  alt=""
                  // The tile's own size: the file is larger (256px, for sharp high-density screens).
                  className="rounded-corner-large size-14 object-cover"
                />
              ) : (
                <span aria-hidden>{initials(context.workspace.name)}</span>
              )}
            </Link>
          }
        >
          {destinations
            .filter((destination) => destination.key !== "home")
            .map((destination) => {
              const group = groups.get(destination.key);
              const key = destination.key;
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
        <SideSheet
          id={panelId}
          variant="standard"
          // Keep mounted and toggle open to preserve animation
          open={isPanelOpen}
          onOpenChange={(open) => {
            if (!open) panel.close();
          }}
          title={openGroup?.heading}
          // Hide the close button - the panel is pinned or previewed, not user-dismissible
          classNames={{
            close: "hidden",
            // Standard variant sits in-layout when pinned, overlays when previewed
            frame: isPinned ? "relative h-full" : "absolute start-full top-0 h-full z-50",
            // Match the nav's width so rows don't clip (the default panel is narrower).
            panel:
              "w-68 h-full rounded-e-corner-large shadow-[2px_0_8px_0_color-mix(in_srgb,var(--md-sys-color-shadow)_20%,transparent)]",
            content: "p-0",
          }}
          // Pinned: reserve 272px in flow; preview: collapse width so frame overlays
          className={isPinned ? "w-68" : "w-0"}
          // Move keep-open handlers to the sheet surface
          onPointerEnter={panel.panel.onPointerEnter}
          onPointerLeave={panel.panel.onPointerLeave}
        >
          {openGroup && (
            <nav
              aria-label={openGroup.label}
              className="flex h-full w-full flex-col overflow-x-hidden overflow-y-auto py-3"
            >
              <ul className="flex flex-col gap-0.5 px-2">
                {openGroup.links.map((link) => {
                  // Use longest-match for aria-current
                  const current =
                    pickCurrentLink(openGroup.links, pathname) === link.href ? "page" : undefined;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={current}
                        className="text-body-medium text-on-surface-variant hover:bg-on-surface/8 focus-visible:outline-secondary aria-[current=page]:bg-secondary-container aria-[current=page]:text-on-secondary-container rounded-corner-full flex items-center px-3 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <span className="min-w-0 flex-1 truncate">{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </SideSheet>
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
