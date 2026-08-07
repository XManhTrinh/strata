import * as React from "react";

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
export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  /** Whether the divider is inset (16px left margin) */
  inset?: boolean;
  /** Orientation of the divider */
  orientation?: "horizontal" | "vertical";
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, inset = false, orientation = "horizontal", ...props }, ref) => (
    <hr
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 border-none bg-outline-variant",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        inset && orientation === "horizontal" && "ml-4",
        inset && orientation === "vertical" && "mt-4",
        className
      )}
      {...props}
    />
  )
);
Divider.displayName = "Divider";

export { Divider };
