"use client";

import { NavigationRail, NavigationRailItem } from "@vkieu/windmorph";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import {
  current as currentGroup,
  isActive,
  pinned as isPinned,
  useVisibleCategories,
  type NavCategory,
} from "./nav-model";
import { GroupTrigger, RailFlyout } from "./rail-flyout";
import { StrataLogo } from "./strata-logo";

/**
 * Hover-intent timing. A short OPEN delay means briefly passing the pointer over adjacent
 * triggers (e.g. on a diagonal path to the panel) does not flash-switch groups; a longer
 * CLOSE delay keeps the panel while the pointer crosses the gap from a trigger into it.
 * Keyboard focus and clicks are immediate — the delays apply to pointer hover only.
 */
const OPEN_DELAY = 60;
const CLOSE_DELAY = 250;

/**
 * The medium+ left navigation rail: a Strata logo header, one plain item per flat category
 * and one navigable group trigger per grouped category (Finance — links to the hub AND opens
 * a secondary flyout of child links), and the display-settings trigger pinned at the bottom.
 *
 * On a Finance DETAIL page the flyout is a PERMANENT secondary pane for Finance (`pinned`);
 * the shell insets content past it. On the Finance hub and every other page the flyout is a
 * transient hover/focus overlay. In both cases hovering a group previews it (after the open
 * delay) and leaving reverts to the active/pinned group (after the close delay). Owns the
 * single open-group state, the hover-intent timers and the flyout's keyboard behaviour.
 */
export function NavRail({ settings }: { settings: ReactNode }) {
  const pathname = usePathname();
  const visibleCategories = useVisibleCategories();
  const current = currentGroup(pathname);
  const pinned = isPinned(pathname, visibleCategories);
  const baseId = useId();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // On a Finance route the panel defaults to Finance; a hover/focus preview overrides it.
  const displayedGroup = openGroup ?? current;
  const open = displayedGroup !== null;
  const flyoutId = (id: string) => `${baseId}-flyout-${id}`;

  // The panel is ALWAYS mounted (closed = inert, width 0) so that every open/close runs the
  // same `data-open` width transition — the first hover after load animates identically to
  // every later one. It keeps showing the last group's content while it closes, updating only
  // to a new non-null group.
  const [shownGroup, setShownGroup] = useState<string | null>(() => displayedGroup);
  if (displayedGroup !== null && displayedGroup !== shownGroup) {
    setShownGroup(displayedGroup);
  }

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Pointer hover: open/switch after the intent delay; a pending open replaces any earlier one.
  const hoverOpen = useCallback(
    (id: string) => {
      clearCloseTimer();
      clearOpenTimer();
      openTimer.current = setTimeout(() => setOpenGroup(id), OPEN_DELAY);
    },
    [clearCloseTimer, clearOpenTimer],
  );

  // Keyboard focus: open immediately (no hover delay).
  const focusOpen = useCallback(
    (id: string) => {
      clearCloseTimer();
      clearOpenTimer();
      setOpenGroup(id);
    },
    [clearCloseTimer, clearOpenTimer],
  );

  // Pointer left a trigger or the panel: close/revert after the close delay (cancellable).
  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenGroup(null), CLOSE_DELAY);
  }, [clearOpenTimer, clearCloseTimer]);

  // Pointer entered the panel (or returned to a trigger): keep it open.
  const cancelClose = useCallback(() => clearCloseTimer(), [clearCloseTimer]);

  const closeNow = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setOpenGroup(null);
  }, [clearOpenTimer, clearCloseTimer]);

  // Drop any hover preview when the route changes (reverts to the new page's pinned group).
  // Storing the previous pathname in state and adjusting during render is React's recommended
  // pattern for resetting state on a prop change — simpler than an effect, and it keeps
  // client-side navigations from leaving a stale preview open.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpenGroup(null);
  }

  // Clear pending timers on unmount so rapid movement can't leave a stuck panel.
  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    [clearOpenTimer, clearCloseTimer],
  );

  const shownCategory: NavCategory | null = shownGroup
    ? (visibleCategories.find((c) => c.id === shownGroup) ?? null)
    : null;

  return (
    <div
      className="hidden md:block fixed inset-block-0 start-0 z-30 h-dvh"
      onKeyDown={(event) => {
        // Escape closes a hover/focus preview (not the pinned active group) and refocuses.
        if (event.key === "Escape" && openGroup && !pinned) {
          const toFocus = triggerRefs.current[openGroup];
          closeNow();
          toFocus?.focus();
        }
      }}
      onBlur={(event) => {
        // Close when focus leaves the whole rail+flyout subtree.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeNow();
      }}
    >
      <NavigationRail
        aria-label="Main navigation"
        classNames={{
          root: "relative z-30 h-full bg-surface-container",
          items: "min-h-0 flex-1",
        }}
      >
        {/* Logo zone: the finished Strata mark, rendered bare (no reference squircle). */}
        <div className="flex shrink-0 items-center justify-center pb-6">
          <StrataLogo />
        </div>

        {/* Middle zone: the scrollable destinations, with M3 rail item rhythm. */}
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {visibleCategories.map((cat) =>
            cat.children && cat.children.length > 0 ? (
              <GroupTrigger
                key={cat.id}
                group={cat}
                open={displayedGroup === cat.id}
                current={current === cat.id}
                flyoutId={flyoutId(cat.id)}
                triggerRef={(node) => {
                  triggerRefs.current[cat.id] = node;
                }}
                onPointerOpen={() => hoverOpen(cat.id)}
                onFocusOpen={() => focusOpen(cat.id)}
                onPointerLeave={scheduleClose}
              />
            ) : (
              <NavigationRailItem
                key={cat.id}
                href={cat.href}
                icon={<Icon name={cat.icon} />}
                selected={isActive(pathname, cat.href)}
              >
                {cat.label}
              </NavigationRailItem>
            ),
          )}
        </div>

        {/* Bottom zone: theme/display controls. */}
        <div className="flex shrink-0 justify-center pb-2 pt-2">{settings}</div>
      </NavigationRail>

      {/* Always mounted (closed = inert, width 0) so every open/close runs the same width
          transition — no first-mount `@starting-style` special case. */}
      <RailFlyout
        id={shownGroup ? flyoutId(shownGroup) : undefined}
        group={shownCategory}
        childLinks={shownCategory?.children ?? []}
        pathname={pathname}
        open={open}
        pinned={pinned}
        // Activating a child navigates within the same group → it pins. Don't force a close
        // here (that would briefly close before the route pins the group, a flicker); just
        // cancel any pending close and let the route-change logic transition in place.
        onNavigate={cancelClose}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
      />
    </div>
  );
}
