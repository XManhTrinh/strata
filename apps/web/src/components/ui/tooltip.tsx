"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Tooltip
 *
 * M3 Specs (m3.material.io/components/tooltips/specs):
 * - Plain tooltip: single line, max 200px width
 * - Rich tooltip: multi-line, max 320px width, surface-container bg
 * - Height: 24px (plain), flexible (rich)
 * - Corner radius: 4px
 * - Background: inverse-surface (plain), surface-container (rich)
 * - Text: inverse-on-surface (plain), on-surface (rich), Body Small (12px/16px)
 * - Padding: 8px horizontal, 4px vertical (plain); 12px (rich)
 * - Delay: 500ms before show, 200ms to hide
 * - Uses framer-motion for fade-in
 */

const tooltipVariants = cva(
  "absolute z-50 pointer-events-none rounded-[4px]",
  {
    variants: {
      variant: {
        plain:
          "max-w-[200px] px-2 py-1 bg-[hsl(var(--on-surface))] text-[hsl(var(--surface))] text-[12px] leading-4 whitespace-nowrap",
        rich:
          "max-w-[320px] px-3 py-2 bg-surface-variant text-surface-foreground text-[14px] leading-5 whitespace-normal shadow-md",
      },
    },
    defaultVariants: {
      variant: "plain",
    },
  }
);

export interface TooltipProps extends VariantProps<typeof tooltipVariants> {
  /** Tooltip text content */
  content: string;
  /** Children element that triggers the tooltip */
  children: React.ReactElement;
  /** Side of the element to show tooltip */
  side?: "top" | "bottom" | "left" | "right";
  /** Additional class */
  className?: string;
  /** Delay before showing (ms) */
  delayShow?: number;
  /** Delay before hiding (ms) */
  delayHide?: number;
}

function Tooltip({
  content,
  children,
  variant,
  side = "top",
  className,
  delayShow = 500,
  delayHide = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const showTimeout = React.useRef<ReturnType<typeof setTimeout>>(null);
  const hideTimeout = React.useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    showTimeout.current = setTimeout(() => setIsVisible(true), delayShow);
  };

  const hide = () => {
    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
    }
    hideTimeout.current = setTimeout(() => setIsVisible(false), delayHide);
  };

  React.useEffect(() => {
    return () => {
      if (showTimeout.current) clearTimeout(showTimeout.current);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              tooltipVariants({ variant }),
              positionClasses[side],
              className
            )}
            role="tooltip"
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export { Tooltip, tooltipVariants };
