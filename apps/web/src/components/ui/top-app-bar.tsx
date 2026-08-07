"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Material Design 3 Top App Bar
 *
 * Specs (m3.material.io/components/app-bars/specs):
 * - Height: 64px
 * - Padding: 4px vertical, 16px horizontal (to content), 4px to edge icons
 * - Background: surface with optional scroll elevation
 * - Leading icon: 48px touch target
 * - Headline: on-surface color
 * - Trailing actions: 48px touch targets, 24px icons
 *
 * Variants:
 * - "small" (default): fixed height 64px, Title Large headline
 * - "center-aligned": centered headline
 */

interface TopAppBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Leading content (navigation icon, typically menu or back arrow) */
  leadingIcon?: React.ReactNode;
  /** Headline text or element */
  headline?: React.ReactNode;
  /** Trailing action icons */
  trailingIcons?: React.ReactNode;
  /** Whether the bar has scroll elevation */
  elevated?: boolean;
  /** Variant */
  variant?: "small" | "center-aligned";
}

const TopAppBar = React.forwardRef<HTMLElement, TopAppBarProps>(
  ({ className, leadingIcon, headline, trailingIcons, elevated, variant = "small", children, ...props }, ref) => {
    return (
      <header
        ref={ref}
        role="banner"
        className={cn(
          "sticky top-0 z-30 flex items-center h-16 px-1 transition-shadow duration-200",
          "bg-[hsl(var(--surface))]",
          elevated && "shadow-sm bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface-variant)/0.3)]",
          className
        )}
        {...props}
      >
        {/* Leading icon slot — 48px touch target */}
        {leadingIcon && (
          <div className="flex items-center justify-center w-12 h-12 shrink-0">
            {leadingIcon}
          </div>
        )}

        {/* Headline — M3 Title Large: 22px, weight 400, on-surface */}
        {headline && (
          <div
            className={cn(
              "flex-1 min-w-0 px-4",
              variant === "center-aligned" && "text-center"
            )}
          >
            {typeof headline === "string" ? (
              <h1 className="text-[22px] leading-7 font-normal text-[hsl(var(--on-surface))] truncate">
                {headline}
              </h1>
            ) : (
              headline
            )}
          </div>
        )}

        {/* If no headline, use children as flexible content */}
        {!headline && children && (
          <div className="flex-1 min-w-0 px-4 flex items-center">
            {children}
          </div>
        )}

        {/* Trailing actions slot — 48px touch targets */}
        {trailingIcons && (
          <div className="flex items-center gap-1 shrink-0 pr-1">
            {trailingIcons}
          </div>
        )}
      </header>
    );
  }
);
TopAppBar.displayName = "TopAppBar";

/**
 * Page-level action bar (used within page content for page title + actions).
 * Not the global navigation bar — this is for page headers.
 *
 * M3 equivalent: Section header / content region header
 * Height: 56px minimum
 */
interface PageBarProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageBar = React.forwardRef<HTMLDivElement, PageBarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center min-h-14 gap-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PageBar.displayName = "PageBar";

export { TopAppBar, PageBar };
