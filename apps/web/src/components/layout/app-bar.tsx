"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page-level action bar for page titles + action buttons.
 * M3: Section header pattern.
 * Height: 56px minimum, items vertically centered.
 */
export function AppBar({ children, className }: AppBarProps) {
  return (
    <div
      className={cn(
        "flex items-center min-h-14 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}
