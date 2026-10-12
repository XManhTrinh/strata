"use client";

import { usePathname } from "next/navigation";

export function RouteAnnouncer() {
  const pathname = usePathname();

  // Build a human-readable page title from the path. Derived during render —
  // the live region re-renders with the new text on each navigation, so the
  // screen-reader announcement behaviour is identical to the previous effect.
  const segments = pathname.split("/").filter(Boolean);
  const pageName =
    segments.length > 0
      ? segments
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
          .join(" — ")
      : "Dashboard";
  const announcement = `Navigated to ${pageName}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
