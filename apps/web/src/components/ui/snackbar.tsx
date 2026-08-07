"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Material Design 3 Snackbar
 *
 * M3 Specs (m3.material.io/components/snackbar/specs):
 * - Height: 48px (single-line), flexible for multi-line
 * - Corner radius: 4px
 * - Background: inverse-surface (on-surface in light, surface in dark)
 * - Text: inverse-on-surface, Body Medium (14px/20px)
 * - Action button: inverse-primary color, text button style
 * - Padding: 16px horizontal
 * - Position: bottom center, 16px from edges on mobile
 * - Duration: 4s default, 10s with action
 * - Uses framer-motion for slide-up entrance
 */

export interface SnackbarProps {
  /** Whether snackbar is visible */
  open: boolean;
  /** Message text */
  message: string;
  /** Action button text */
  actionLabel?: string;
  /** Action callback */
  onAction?: () => void;
  /** Close callback */
  onClose?: () => void;
  /** Duration in ms (default 4000, with action 10000) */
  duration?: number;
  /** Show close icon */
  showClose?: boolean;
  /** Additional class */
  className?: string;
}

const Snackbar = React.forwardRef<HTMLDivElement, SnackbarProps>(
  (
    {
      open,
      message,
      actionLabel,
      onAction,
      onClose,
      duration,
      showClose = false,
      className,
    },
    ref
  ) => {
    const effectiveDuration = duration ?? (actionLabel ? 10000 : 4000);

    React.useEffect(() => {
      if (!open) return;
      const timer = setTimeout(() => {
        onClose?.();
      }, effectiveDuration);
      return () => clearTimeout(timer);
    }, [open, effectiveDuration, onClose]);

    return (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-[560px]",
              "flex items-center min-h-12 gap-2 px-4 py-3 rounded-[4px]",
              "bg-[hsl(var(--on-surface))] text-[hsl(var(--surface))]",
              "shadow-lg",
              className
            )}
            role="status"
            aria-live="polite"
          >
            {/* Message */}
            <span className="flex-1 text-[14px] leading-5">
              {message}
            </span>

            {/* Action button */}
            {actionLabel && (
              <button
                type="button"
                onClick={() => {
                  onAction?.();
                  onClose?.();
                }}
                className="shrink-0 text-[14px] leading-5 font-medium text-[hsl(var(--primary))] hover:opacity-80 transition-opacity px-2"
              >
                {actionLabel}
              </button>
            )}

            {/* Close icon */}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 flex items-center justify-center w-8 h-8 -mr-1 rounded-full hover:bg-[hsl(var(--surface)/0.08)] transition-colors"
                aria-label="Dismiss"
              >
                <Icon name="close" size={20} className="text-[hsl(var(--surface))]" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
Snackbar.displayName = "Snackbar";

export { Snackbar };
