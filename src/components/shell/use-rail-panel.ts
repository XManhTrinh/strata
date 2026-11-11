import { useCallback, useEffect, useRef, useState } from "react";

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

/** Pick the longest matching href for aria-current (e.g. /planning beats /planning). */
export function pickCurrentLink(links: RailPanelLink[], pathname: string): string | null {
  let current: string | null = null;
  let currentLen = 0;
  for (const link of links) {
    if (pathname === link.href || pathname.startsWith(`${link.href}/`)) {
      if (link.href.length > currentLen) {
        current = link.href;
        currentLen = link.href.length;
      }
    }
  }
  return current;
}
