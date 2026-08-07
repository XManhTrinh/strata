"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Menu
 *
 * M3 Specs (m3.material.io/components/menus/specs):
 * - Min-width: 112px, max-width: 280px
 * - Item height: 48px
 * - Corner radius: 4px
 * - Padding: 8px vertical
 * - Item padding: 12px horizontal
 * - Font: Label Large (14px/20px)
 * - Leading icon: 24px, trailing text/icon optional
 * - Elevation: level 2
 * - Background: surface-container (mapped to popover)
 */

const Menu = DropdownMenuPrimitive.Root;

const MenuTrigger = DropdownMenuPrimitive.Trigger;

const MenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[112px] max-w-[280px] overflow-hidden rounded-[4px] bg-popover py-2 shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
MenuContent.displayName = "MenuContent";

export interface MenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  /** Leading icon name */
  leadingIcon?: string;
  /** Trailing text or shortcut */
  trailingText?: string;
  /** Trailing icon name */
  trailingIcon?: string;
}

const MenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  MenuItemProps
>(({ className, leadingIcon, trailingText, trailingIcon, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "flex items-center gap-3 h-12 px-3 text-[14px] leading-5 font-medium text-surface-foreground cursor-pointer select-none outline-none transition-colors",
      "focus:bg-surface-foreground/[0.08]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-38",
      className
    )}
    {...props}
  >
    {leadingIcon && (
      <Icon name={leadingIcon} size={24} className="text-surface-variant-foreground" />
    )}
    <span className="flex-1">{children}</span>
    {trailingText && (
      <span className="text-[14px] leading-5 text-surface-variant-foreground">
        {trailingText}
      </span>
    )}
    {trailingIcon && (
      <Icon name={trailingIcon} size={24} className="text-surface-variant-foreground" />
    )}
  </DropdownMenuPrimitive.Item>
));
MenuItem.displayName = "MenuItem";

const MenuDivider = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("h-px my-1 bg-outline-variant", className)}
    {...props}
  />
));
MenuDivider.displayName = "MenuDivider";

export { Menu, MenuTrigger, MenuContent, MenuItem, MenuDivider };
