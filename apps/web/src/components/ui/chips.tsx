"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Chip
 *
 * M3 Specs (m3.material.io/components/chips/specs):
 * - Height: 32px
 * - Border-radius: 8px
 * - Padding: 16px horizontal (with icon: 8px start, 16px end)
 * - Font: Label Large (14px/20px, weight 500)
 * - Variants: assist, filter, input, suggestion
 * - Filter chip: has checkmark icon when selected, filled bg
 * - Border: 1px outline color (unselected), no border (selected)
 * - Icon size: 18px
 * - Touch target: 48px (via padding/margin)
 */
const chipVariants = cva(
  "inline-flex items-center justify-center h-8 rounded-lg text-[14px] leading-5 font-medium transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-38",
  {
    variants: {
      variant: {
        assist:
          "border border-outline text-surface-foreground px-4 hover:bg-surface-foreground/[0.08]",
        filter:
          "border border-outline text-surface-foreground px-4 hover:bg-surface-foreground/[0.08]",
        input:
          "border border-outline text-surface-foreground px-4 hover:bg-surface-foreground/[0.08]",
        suggestion:
          "border border-outline text-surface-foreground px-4 hover:bg-surface-foreground/[0.08]",
      },
      selected: {
        true: "border-transparent bg-secondary-container text-secondary-container-foreground hover:bg-secondary-container/90",
        false: "",
      },
    },
    defaultVariants: {
      variant: "assist",
      selected: false,
    },
  }
);

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof chipVariants> {
  /** Leading icon name (Material Symbols) */
  leadingIcon?: string;
  /** Trailing icon name (Material Symbols) */
  trailingIcon?: string;
  /** Whether chip is selected (filter/input variants) */
  selected?: boolean;
  /** Callback when chip is dismissed (input variant) */
  onDismiss?: () => void;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      variant,
      selected = false,
      leadingIcon,
      trailingIcon,
      onDismiss,
      children,
      ...props
    },
    ref
  ) => {
    const showCheckmark = variant === "filter" && selected;
    const showDismiss = variant === "input" && onDismiss;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          chipVariants({ variant, selected }),
          (leadingIcon || showCheckmark) && "pl-2",
          (trailingIcon || showDismiss) && "pr-2",
          className
        )}
        {...props}
      >
        {showCheckmark && (
          <Icon name="check" size={18} className="mr-2" />
        )}
        {!showCheckmark && leadingIcon && (
          <Icon name={leadingIcon} size={18} className="mr-2" />
        )}
        <span>{children}</span>
        {showDismiss && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onDismiss?.();
              }
            }}
            className="ml-2 inline-flex items-center justify-center"
          >
            <Icon name="close" size={18} />
          </span>
        )}
        {!showDismiss && trailingIcon && (
          <Icon name={trailingIcon} size={18} className="ml-2" />
        )}
      </button>
    );
  }
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
