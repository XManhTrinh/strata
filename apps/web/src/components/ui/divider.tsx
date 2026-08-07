import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Divider
 *
 * M3 Specs (m3.material.io/components/divider/specs):
 * - Height: 1px
 * - Color: outline-variant
 * - Full-width or inset (16px left margin for inset)
 * - Vertical variant supported
 */
const dividerVariants = cva("shrink-0 border-none bg-outline-variant", {
  variants: {
    variant: {
      fullWidth: "",
      inset: "",
    },
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
  },
  compoundVariants: [
    { variant: "inset", orientation: "horizontal", className: "ml-4" },
    { variant: "inset", orientation: "vertical", className: "mt-4" },
  ],
  defaultVariants: {
    variant: "fullWidth",
    orientation: "horizontal",
  },
});

export interface DividerProps
  extends React.HTMLAttributes<HTMLHRElement>,
    VariantProps<typeof dividerVariants> {}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, variant, orientation = "horizontal", ...props }, ref) => (
    <hr
      ref={ref}
      role="separator"
      aria-orientation={orientation ?? "horizontal"}
      className={cn(dividerVariants({ variant, orientation }), className)}
      {...props}
    />
  )
);
Divider.displayName = "Divider";

export { Divider, dividerVariants };
