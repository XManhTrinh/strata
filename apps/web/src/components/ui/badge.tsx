import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Badge
 *
 * M3 Specs (m3.material.io/components/badges/specs):
 * - Small badge: 6px dot, no label
 * - Large badge: 16px height, min-width 16px, border-radius 8px (pill), 4px horizontal padding
 * - Font: Label Small (11px/16px, weight 500)
 * - Colors: error container for badge bg, on-error for text
 * - Variants: default (small dot), count (with number), status (success/warning/error)
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium select-none",
  {
    variants: {
      variant: {
        default:
          "h-1.5 w-1.5 rounded-full bg-error",
        count:
          "h-4 min-w-4 rounded-[8px] px-1 bg-error text-error-foreground text-[11px] leading-4 font-medium",
        status:
          "h-4 min-w-4 rounded-[8px] px-1 text-[11px] leading-4 font-medium",
      },
      status: {
        error: "bg-error text-error-foreground",
        success: "bg-tertiary text-tertiary-foreground",
        warning: "bg-tertiary-container text-tertiary-container-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Count to display (used with count variant) */
  count?: number;
  /** Max count before showing "99+" */
  max?: number;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, status, count, max = 99, children, ...props }, ref) => {
    const displayText =
      variant === "count" && count !== undefined
        ? count > max
          ? `${max}+`
          : String(count)
        : children;

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, status: variant === "status" ? status : undefined }), className)}
        {...props}
      >
        {variant !== "default" && displayText}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
