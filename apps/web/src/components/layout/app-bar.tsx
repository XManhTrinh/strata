"use client";

import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface AppBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Shared page-level toolbar/action bar.
 * Fixed min-height of 60px, items vertically centered, no top/bottom padding.
 * Use for page headers with actions, filters, navigation controls.
 */
export function AppBar({ children, className }: AppBarProps) {
  return (
    <div
      className={twMerge(
        "flex items-center min-h-15",
        className
      )}
    >
      {children}
    </div>
  );
}
