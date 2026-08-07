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
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  /** Leading icon (defaults to "search") */
  leadingIcon?: string;
  /** Trailing icon name */
  trailingIcon?: string;
  /** Callback when trailing icon is clicked */
  onTrailingIconClick?: () => void;
  /** Trailing content (e.g., avatar) */
  trailingContent?: React.ReactNode;
  /** Convenience string value change handler (like SearchInput from @strata/ui) */
  onValueChange?: (value: string) => void;
  /** Standard React onChange */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      className,
      leadingIcon = "search",
      trailingIcon,
      onTrailingIconClick,
      trailingContent,
      onValueChange,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    const handleClear = () => {
      onValueChange?.("");
      onTrailingIconClick?.();
    };

    const showClear = value && String(value).length > 0;

    return (
      <div
        className={cn(
          "flex items-center h-12 w-full rounded-[28px] bg-surface-variant px-3 gap-3 transition-shadow focus-within:shadow-md",
          className
        )}
      >
        {/* Leading icon */}
        <div className="flex items-center justify-center w-10 h-10 shrink-0">
          <Icon name={leadingIcon} size={20} className="text-surface-variant-foreground" />
        </div>

        {/* Input */}
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={handleChange}
          className="flex-1 h-full bg-transparent text-[14px] leading-5 text-surface-foreground placeholder:text-surface-variant-foreground outline-none"
          {...props}
        />

        {/* Clear / Trailing */}
        {showClear && !trailingContent && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full hover:bg-surface-foreground/8 transition-colors"
            aria-label="Clear search"
          >
            <Icon name="close" size={20} className="text-surface-variant-foreground" />
          </button>
        )}
        {trailingContent && (
          <div className="flex items-center justify-center w-10 h-10 shrink-0">
            {trailingContent}
          </div>
        )}
        {!showClear && !trailingContent && trailingIcon && (
          <button
            type="button"
            onClick={onTrailingIconClick}
            className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full hover:bg-surface-foreground/8 transition-colors"
            aria-label={trailingIcon}
          >
            <Icon name={trailingIcon} size={20} className="text-surface-variant-foreground" />
          </button>
        )}
      </div>
    );
  }
);
SearchBar.displayName = "SearchBar";

export { SearchBar };
