"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Search Bar
 *
 * M3 Specs (m3.material.io/components/search/specs):
 * - Height: 56px
 * - Corner radius: 28px (full rounded)
 * - Background: surface-container-highest (surface-variant)
 * - Leading icon: search, 48px touch target
 * - Trailing icon: avatar or mic, 48px
 * - Font: Body Large (16px/24px)
 * - Padding: 16px horizontal (to icons)
 * - On focus: expands to search view (optional)
 */

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Leading icon (defaults to "search") */
  leadingIcon?: string;
  /** Trailing icon name */
  trailingIcon?: string;
  /** Callback when trailing icon is clicked */
  onTrailingIconClick?: () => void;
  /** Trailing content (e.g., avatar) */
  trailingContent?: React.ReactNode;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      className,
      leadingIcon = "search",
      trailingIcon,
      onTrailingIconClick,
      trailingContent,
      ...props
    },
    ref
  ) => (
    <div
      className={cn(
        "flex items-center h-14 w-full rounded-[28px] bg-surface-variant px-4 gap-4 transition-shadow focus-within:shadow-md",
        className
      )}
    >
      {/* Leading icon — 48px touch target */}
      <div className="flex items-center justify-center w-12 h-12 shrink-0 -ml-2">
        <Icon name={leadingIcon} size={24} className="text-surface-variant-foreground" />
      </div>

      {/* Input */}
      <input
        ref={ref}
        type="search"
        className={cn(
          "flex-1 h-full bg-transparent text-[16px] leading-6 text-surface-foreground placeholder:text-surface-variant-foreground outline-none"
        )}
        {...props}
      />

      {/* Trailing */}
      {trailingContent && (
        <div className="flex items-center justify-center w-12 h-12 shrink-0 -mr-2">
          {trailingContent}
        </div>
      )}
      {!trailingContent && trailingIcon && (
        <button
          type="button"
          onClick={onTrailingIconClick}
          className="flex items-center justify-center w-12 h-12 shrink-0 -mr-2 rounded-full hover:bg-surface-foreground/[0.08] transition-colors"
          aria-label={trailingIcon}
        >
          <Icon name={trailingIcon} size={24} className="text-surface-variant-foreground" />
        </button>
      )}
    </div>
  )
);
SearchBar.displayName = "SearchBar";

export { SearchBar };
