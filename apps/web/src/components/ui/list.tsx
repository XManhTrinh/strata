"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 List
 *
 * M3 Specs (m3.material.io/components/lists/specs):
 * - Item height: 56px (one-line), 72px (two-line), 88px (three-line)
 * - Leading element: 24px icon or 40px avatar or 56px image
 * - Trailing element: 24px icon or text
 * - Padding: 16px horizontal, 8px vertical for list container
 * - Item padding: 16px horizontal
 * - Divider between items (optional)
 * - State layer on hover/press
 * - Font: Body Large (16px/24px) for headline, Body Medium (14px/20px) for supporting text
 */

export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Show dividers between items */
  dividers?: boolean;
}

const List = React.forwardRef<HTMLUListElement, ListProps>(
  ({ className, dividers = false, children, ...props }, ref) => (
    <ul
      ref={ref}
      role="list"
      className={cn(
        "py-2 px-0",
        dividers && "[&>li+li]:border-t [&>li+li]:border-outline-variant",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  )
);
List.displayName = "List";

export interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  /** Headline text */
  headline: string;
  /** Supporting (secondary) text */
  supportingText?: string;
  /** Tertiary text (third line) */
  tertiaryText?: string;
  /** Leading icon name */
  leadingIcon?: string;
  /** Leading content (avatar, image, or custom element) */
  leadingContent?: React.ReactNode;
  /** Trailing icon name */
  trailingIcon?: string;
  /** Trailing text/content */
  trailingContent?: React.ReactNode;
  /** Number of lines: determines item height */
  lines?: 1 | 2 | 3;
  /** Whether the item is interactive */
  interactive?: boolean;
}

const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  (
    {
      className,
      headline,
      supportingText,
      tertiaryText,
      leadingIcon,
      leadingContent,
      trailingIcon,
      trailingContent,
      lines = 1,
      interactive = true,
      ...props
    },
    ref
  ) => {
    const heightClass =
      lines === 3 ? "min-h-[88px]" : lines === 2 ? "min-h-[72px]" : "min-h-[56px]";

    return (
      <li
        ref={ref}
        className={cn(
          "flex items-center gap-4 px-4",
          heightClass,
          interactive && "cursor-pointer hover:bg-surface-foreground/[0.08] active:bg-surface-foreground/[0.12] transition-colors",
          className
        )}
        {...props}
      >
        {/* Leading */}
        {leadingContent && (
          <div className="shrink-0 flex items-center justify-center">
            {leadingContent}
          </div>
        )}
        {!leadingContent && leadingIcon && (
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <Icon name={leadingIcon} size={24} className="text-surface-variant-foreground" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 py-2">
          <p className="text-[16px] leading-6 text-surface-foreground truncate">
            {headline}
          </p>
          {supportingText && (
            <p className="text-[14px] leading-5 text-surface-variant-foreground truncate">
              {supportingText}
            </p>
          )}
          {tertiaryText && lines === 3 && (
            <p className="text-[14px] leading-5 text-surface-variant-foreground truncate">
              {tertiaryText}
            </p>
          )}
        </div>

        {/* Trailing */}
        {trailingContent && (
          <div className="shrink-0 flex items-center">
            {trailingContent}
          </div>
        )}
        {!trailingContent && trailingIcon && (
          <div className="shrink-0 flex items-center justify-center w-6 h-6">
            <Icon name={trailingIcon} size={24} className="text-surface-variant-foreground" />
          </div>
        )}
      </li>
    );
  }
);
ListItem.displayName = "ListItem";

export { List, ListItem };
