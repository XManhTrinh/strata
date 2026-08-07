"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Toolbar (Contextual Action Bar)
 *
 * M3 Specs:
 * - Height: 64px
 * - Background: surface
 * - Used for selection mode, formatting actions, etc.
 * - Leading: close/back icon
 * - Headline: context text (e.g., "3 selected")
 * - Trailing: action icons
 */

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="toolbar"
      className={cn(
        "flex items-center h-16 px-1 bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Toolbar.displayName = "Toolbar";

export interface ToolbarLeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon name for the leading button (e.g., "close", "arrow_back") */
  icon?: string;
  /** Callback when leading icon is pressed */
  onPress?: () => void;
}

const ToolbarLeading = React.forwardRef<HTMLDivElement, ToolbarLeadingProps>(
  ({ className, icon = "close", onPress, ...props }, ref) => (
    <div ref={ref} className={cn("shrink-0", className)} {...props}>
      <button
        type="button"
        onClick={onPress}
        className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/[0.08] transition-colors"
        aria-label={icon === "close" ? "Close" : "Back"}
      >
        <Icon name={icon} size={24} className="text-surface-foreground" />
      </button>
    </div>
  )
);
ToolbarLeading.displayName = "ToolbarLeading";

export interface ToolbarHeadlineProps extends React.HTMLAttributes<HTMLDivElement> {}

const ToolbarHeadline = React.forwardRef<HTMLDivElement, ToolbarHeadlineProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex-1 px-4 text-[16px] leading-6 font-medium text-surface-foreground truncate",
        className
      )}
      {...props}
    />
  )
);
ToolbarHeadline.displayName = "ToolbarHeadline";

export interface ToolbarActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const ToolbarActions = React.forwardRef<HTMLDivElement, ToolbarActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center shrink-0", className)}
      {...props}
    />
  )
);
ToolbarActions.displayName = "ToolbarActions";

export interface ToolbarActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon name */
  icon: string;
  /** Accessible label */
  label: string;
}

const ToolbarAction = React.forwardRef<HTMLButtonElement, ToolbarActionProps>(
  ({ className, icon, label, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full hover:bg-surface-foreground/[0.08] transition-colors",
        className
      )}
      {...props}
    >
      <Icon name={icon} size={24} className="text-surface-foreground" />
    </button>
  )
);
ToolbarAction.displayName = "ToolbarAction";

export { Toolbar, ToolbarLeading, ToolbarHeadline, ToolbarActions, ToolbarAction };
