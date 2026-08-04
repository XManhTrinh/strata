"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Build a human-readable page title from the path
    const segments = pathname.split("/").filter(Boolean);
    const pageName =
      segments.length > 0
        ? segments
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
            .join(" — ")
        : "Dashboard";

    setAnnouncement(`Navigated to ${pageName}`);
  }, [pathname]);

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
