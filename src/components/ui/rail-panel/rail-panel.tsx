"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type RailPanelLink = { href: string; label: string };

export type RailPanelGroup = {
  /** Shown as the panel's small heading. */
  heading: string;
  /** The panel's accessible name. */
  label: string;
  links: RailPanelLink[];
};

/**
 * Hover intent: a short open delay so a pointer crossing the rail doesn't flash other groups,
 * and a longer close delay to cross the gap into the panel. Focus and clicks are immediate.
 */
const OPEN_DELAY = 60;
const CLOSE_DELAY = 250;

/**
 * The open group of a rail with secondary panels: the current page's group (pinned), or one
 * previewed by hover or focus. Returns handlers for each trigger and for the panel.
 */
export function useRailPanel<Id extends string>(current: Id | null, pathname: string) {
  const [preview, setPreview] = useState<Id | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clear = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => clear, [clear]);

  // A new page drops any preview, showing its own group.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPreview(null);
  }

  // Escape closes a preview (the current page's group stays).
  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  const open = preview ?? current;
  return {
    /** The group shown in the panel, or null when it is closed. */
    open,
    /** Whether the panel sits in the layout (the current page's group) rather than over it. */
    pinned: current !== null,
    trigger: (id: Id) => ({
      onPointerEnter: () => {
        clear();
        openTimer.current = setTimeout(() => setPreview(id), OPEN_DELAY);
      },
      onPointerLeave: () => {
        clear();
        closeTimer.current = setTimeout(() => setPreview(null), CLOSE_DELAY);
      },
      onFocus: () => {
        clear();
        setPreview(id);
      },
    }),
    panel: {
      onPointerEnter: () => clearTimeout(closeTimer.current),
      onPointerLeave: () => {
        clear();
        closeTimer.current = setTimeout(() => setPreview(null), CLOSE_DELAY);
      },
    },
    close: () => {
      clear();
      setPreview(null);
    },
  };
}

/**
 * A navigation rail's secondary pane of links (Material 3's rail with a navigation drawer
 * beside it): pinned in the layout for the current page's group, or over the page while
 * another group is previewed. A labelled `<nav>` of ordinary links, the current one marked
 * `aria-current="page"`. It stays mounted and slides its width, so it animates both ways;
 * closed, it is inert.
 */
export function RailPanel({
  id,
  groupKey,
  group,
  open,
  pinned,
  pathname,
  onPointerEnter,
  onPointerLeave,
}: {
  id: string;
  /** Identifies the group shown, so a new one fades in. */
  groupKey: string | null;
  group: RailPanelGroup | null;
  open: boolean;
  pinned: boolean;
  pathname: string;
  onPointerEnter: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
}) {
  // Keep showing the last group while the panel closes.
  const [last, setLast] = useState<{ key: string; group: RailPanelGroup } | null>(null);
  if (groupKey && group && groupKey !== last?.key) setLast({ key: groupKey, group });
  const shown = group ?? last?.group ?? null;
  const current = shown?.links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav
      id={id}
      aria-label={shown?.label}
      data-open={open}
      inert={!open || undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      // As Windmorph's site: large corners and a soft shadow on the end edge, pinned or not;
      // the width springs open and snaps under reduced motion.
      className={`bg-surface-container rounded-e-corner-large z-30 flex h-full flex-col overflow-x-hidden overflow-y-auto shadow-[2px_0_8px_0_color-mix(in_srgb,var(--md-sys-color-shadow)_20%,transparent)] transition-[width,opacity] duration-[var(--md-sys-motion-spring-spatial-default-duration)] ease-[var(--md-sys-motion-spring-spatial-default-easing)] will-change-[width] motion-reduce:transition-none rtl:shadow-[-2px_0_8px_0_color-mix(in_srgb,var(--md-sys-color-shadow)_20%,transparent)] ${
        pinned ? "relative" : "absolute start-full top-0"
      } ${
        open
          ? "w-68 opacity-100"
          : "pointer-events-none w-0 opacity-0 duration-[var(--md-sys-motion-spring-spatial-fast-duration)] ease-[var(--md-sys-motion-spring-spatial-fast-easing)]"
      }`}
    >
      <span
        aria-hidden
        className="bg-outline-variant pointer-events-none absolute inset-y-0 start-0 w-px"
      />
      {shown && (
        <div key={groupKey ?? last?.key} className="flex w-68 shrink-0 flex-col">
          <p className="text-label-small text-on-surface-variant px-4 pt-5 pb-3 uppercase">
            {shown.heading}
          </p>
          <ul className="flex flex-col gap-0.5 px-2 pb-3">
            {shown.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link === current ? "page" : undefined}
                  className="text-body-medium text-on-surface-variant hover:bg-on-surface/8 focus-visible:outline-secondary aria-[current=page]:bg-secondary-container aria-[current=page]:text-on-secondary-container rounded-corner-full flex items-center px-3 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="min-w-0 flex-1 truncate">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
