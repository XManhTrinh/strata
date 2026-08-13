"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import { Icon } from "@vkieu/mui";

/**
 * Material Design 3 Select (Exposed Dropdown Menu)
 *
 * M3 doesn't have a dedicated "Select" but uses an exposed dropdown menu
 * styled like an outlined text field with a dropdown arrow.
 *
 * Trigger (outlined text field pattern):
 * - 56dp height, 1dp border (outline), 4dp radius
 * - Body Large (16px/400/24px/0.5px) for value text
 * - Floating label above when value is selected
 * - Focus: 2dp border, primary color
 * - Trailing chevron icon
 *
 * Content (menu pattern):
 * - surface-container bg, 4dp radius, shadow
 * - Items: 48dp height, 12dp padding, on-surface text
 * - Selected item: surface-container-highest bg
 * - Enter: 150ms fade-in + scale; Exit: 75ms fade-out
 *
 * @see https://m3.material.io/components/menus/specs
 * @see https://m3.material.io/components/text-fields/specs
 */

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  label?: string;
}

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, label, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "group relative flex items-center w-full h-14 rounded-sm bg-transparent",
      // Border — outlined text field style
      "border border-outline",
      "hover:border-[hsl(var(--on-surface))]",
      "focus:border-2 focus:border-primary focus:outline-none",
      "data-[state=open]:border-2 data-[state=open]:border-primary",
      // Typography — Body Large
      "text-[16px] leading-6 tracking-[0.5px] text-surface-foreground",
      // Padding
      "px-4",
      // Disabled
      "disabled:pointer-events-none disabled:border-[hsl(var(--on-surface)/0.12)] disabled:text-[hsl(var(--on-surface)/0.38)]",
      className
    )}
    {...props}
  >
    {/* Floating label */}
    {label && (
      <span
        className={cn(
          "absolute pointer-events-none origin-top-left",
          "transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          "text-[12px] leading-4 tracking-[0.4px]",
          "-top-2 left-3 px-1 bg-[hsl(var(--surface))]",
          // Color
          "text-surface-variant-foreground",
          "group-focus:text-primary",
          "group-data-[state=open]:text-primary"
        )}
      >
        {label}
      </span>
    )}
    <span className="flex-1 truncate text-left">{children}</span>
    <SelectPrimitive.Icon asChild>
      <Icon
        name="arrow_drop_down"
        size={24}
        className="shrink-0 text-surface-variant-foreground ml-2"
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>;

const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex items-center justify-center h-6 cursor-default",
      className
    )}
    {...props}
  >
    <Icon name="arrow_drop_up" size={20} className="text-surface-variant-foreground" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex items-center justify-center h-6 cursor-default",
      className
    )}
    {...props}
  >
    <Icon name="arrow_drop_down" size={20} className="text-surface-variant-foreground" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "relative z-50 min-w-28 max-w-70 overflow-hidden",
        // M3 menu surface
        "rounded-sm bg-surface-container py-2 shadow-md",
        // Animation via theme.css m3-animate-menu class
        "m3-animate-menu",
        // Popper positioning
        position === "popper" && [
          "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          "data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1",
        ],
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          position === "popper" &&
            "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "px-3 py-1.5 text-[12px] leading-4 tracking-[0.4px] font-medium text-surface-variant-foreground",
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

type SelectItemProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex items-center w-full h-12 px-3 text-[14px] leading-5 font-medium text-surface-foreground cursor-pointer select-none outline-none",
      // State layers
      "focus:bg-surface-foreground/8 active:bg-surface-foreground/10",
      // Selected state
      "data-[state=checked]:bg-surface-container-highest",
      // Disabled
      "data-disabled:pointer-events-none data-disabled:opacity-[0.38]",
      className
    )}
    {...props}
  >
    {/* Checkmark for selected item */}
    <span className="flex items-center justify-center w-6 h-6 mr-2">
      <SelectPrimitive.ItemIndicator>
        <Icon name="check" size={20} className="text-primary" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText className="flex-1 truncate">
      {children}
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("h-px my-2 bg-outline-variant", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
